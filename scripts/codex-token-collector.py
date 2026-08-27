"""Codex token collector for claude-token-tracker.

Reads JSONL sessions from ~/.codex/sessions/**/*.jsonl, dedups via state file,
posts token usage to the claude-token-tracker webhook with source="codex".
One webhook entry per new last_token_usage event.

Env vars:
  TOKEN_TRACKER_WEBHOOK         URL do webhook (default: http://localhost:3002/api/webhook/track-tokens)
  TOKEN_TRACKER_TOKEN           Token de autenticacao (sem ele, server pode rejeitar)
  CODEX_HOME                    Override do ~/.codex root
  CODEX_TOKEN_COLLECTOR_STATE   Override do state file path

CLI:
  --dry-run            Print payloads JSON, sem HTTP send
  --limit N            Cap N entries por run (0 = sem limite)
  --watch              Loop infinito polling JSONLs novos
  --interval N         Sleep N segundos entre runs em watch (default 2.0, min 0.5)
  --profile            Print timing/skip stats em stderr

State file: ~/.codex/token-collector-state.json (auto-criado).
Backward-compat: chaves "<filepath>" -> int (line_no) + chave "__mtime" -> dict[filepath, float]
(Wave 6 cache de mtime pra skipar files inalterados).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
import urllib.error
from urllib.request import Request, urlopen


DEFAULT_WEBHOOK = "http://localhost:3002/api/webhook/track-tokens"


def codex_home() -> Path:
    return Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))


def state_path() -> Path:
    return Path(os.environ.get("CODEX_TOKEN_COLLECTOR_STATE", codex_home() / "token-collector-state.json"))


def load_state() -> dict:
    """Carrega state file. Schema retrocompat:
      - chaves "filepath" -> int (line_no processada)  [formato antigo]
      - chave "__mtime"   -> dict[filepath, float] (mtime ao processar)  [Wave 6]
    Files SEM entrada em __mtime sao processados normal (sem skip).
    """
    path = state_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception:
        return {}


def save_state(state: dict) -> None:
    path = state_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, indent=2, sort_keys=True), encoding="utf-8")


def session_files() -> list[Path]:
    root = codex_home() / "sessions"
    if not root.exists():
        return []
    return sorted(root.glob("**/*.jsonl"), key=lambda p: p.stat().st_mtime)


def first_user_message(path: Path) -> str | None:
    try:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if entry.get("type") != "event_msg":
                    continue
                payload = entry.get("payload") or {}
                if payload.get("type") != "user_message":
                    continue
                msg = " ".join(str(payload.get("message", "")).split())
                if len(msg) > 120:
                    msg = msg[:117].rsplit(" ", 1)[0] + "..."
                return msg or None
    except OSError:
        return None
    return None


def session_meta(path: Path) -> dict[str, str]:
    meta = {"session_id": path.stem, "model": "unknown", "cwd": ""}
    try:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if entry.get("type") == "session_meta":
                    payload = entry.get("payload") or {}
                    meta["session_id"] = payload.get("id") or meta["session_id"]
                    meta["cwd"] = payload.get("cwd") or ""
                if entry.get("type") == "turn_context":
                    payload = entry.get("payload") or {}
                    meta["model"] = payload.get("model") or meta["model"]
                    return meta
    except OSError:
        pass
    return meta


def session_thread_name(session_id: str) -> str | None:
    index = codex_home() / "session_index.jsonl"
    if not index.exists():
        return None
    latest: str | None = None
    try:
        with index.open("r", encoding="utf-8") as f:
            for line in f:
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if entry.get("id") == session_id and entry.get("thread_name"):
                    latest = str(entry["thread_name"])
    except OSError:
        return None
    if latest:
        latest = " ".join(latest.split())
        return latest[:100]
    return None


def extract_new_entries(path: Path, start_line: int) -> tuple[list[dict], int]:
    meta = session_meta(path)
    auto_name = first_user_message(path)
    session_name = session_thread_name(meta["session_id"])
    entries: list[dict] = []
    line_no = 0

    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line_no += 1
            if line_no <= start_line:
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event.get("type") != "event_msg":
                continue
            payload = event.get("payload") or {}
            if payload.get("type") != "token_count":
                continue
            info = payload.get("info") or {}
            usage = info.get("last_token_usage") or {}
            if not usage:
                continue

            input_tokens = int(usage.get("input_tokens") or 0)
            output_tokens = int(usage.get("output_tokens") or 0)
            cached_tokens = int(usage.get("cached_input_tokens") or 0)
            total_tokens = int(usage.get("total_tokens") or (input_tokens + output_tokens))
            if input_tokens <= 0 and output_tokens <= 0 and cached_tokens <= 0:
                continue

            item = {
                "timestamp": event.get("timestamp") or datetime.now(timezone.utc).isoformat(),
                "source": "codex",
                "model": meta["model"],
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cache_read_tokens": cached_tokens,
                "cache_write_tokens": 0,
                "total_tokens": total_tokens,
                "session_id": meta["session_id"],
                "conversation_url": "",
            }
            if auto_name:
                item["auto_name"] = auto_name
            if session_name:
                item["session_name"] = session_name
            entries.append(item)

    return entries, line_no


def send(payload: dict, webhook: str, token: str) -> None:
    body = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["X-Webhook-Token"] = token
    req = Request(webhook, data=body, headers=headers, method="POST")
    # Defensive throttle — 50ms entre envios = max 1200/min, well below 120/min limit
    # mesmo se loopback skip falhar no server.
    time.sleep(0.05)
    try:
        with urlopen(req, timeout=10) as response:
            response.read()
    except urllib.error.HTTPError as e:
        if e.code == 429:
            sys.stderr.write(f"[collector] 429 rate limited. Sleeping 60s...\n")
            time.sleep(60)
            # 1 retry inline
            with urlopen(req, timeout=10) as response:
                response.read()
            return
        raise


def collect_once(webhook: str, token: str, dry_run: bool = False, limit: int = 0, profile: bool = False) -> int:
    """Collect new token events.

    Perf: skipa arquivos cujo mtime nao mudou desde ultima execucao (Wave 6 fix).
    Cache key em state["__mtime"][filepath] = mtime ao final do scan anterior.
    """
    t0 = time.time()
    state = load_state()
    if not isinstance(state, dict):
        state = {}
    mtime_cache = state.get("__mtime") if isinstance(state.get("__mtime"), dict) else {}

    sent = 0
    skipped_mtime = 0
    scanned = 0

    files = session_files()
    t_files = time.time()

    for file in files:
        key = str(file)
        # Skip se mtime nao mudou (file processado completo na run anterior).
        try:
            current_mtime = file.stat().st_mtime
        except OSError:
            current_mtime = None

        cached_mtime = mtime_cache.get(key)
        if (
            cached_mtime is not None
            and current_mtime is not None
            and current_mtime <= cached_mtime
        ):
            skipped_mtime += 1
            continue

        scanned += 1
        start = int(state.get(key, 0)) if isinstance(state.get(key), int) else 0
        try:
            entries, last_line = extract_new_entries(file, start)
        except OSError as exc:
            print(f"skip {file}: {exc}", file=sys.stderr)
            continue

        for entry in entries:
            if limit and sent >= limit:
                break
            if dry_run:
                print(json.dumps(entry, ensure_ascii=False))
            else:
                send(entry, webhook, token)
            sent += 1

        if not dry_run:
            state[key] = last_line
            if current_mtime is not None:
                mtime_cache[key] = current_mtime
        if limit and sent >= limit:
            break

    if not dry_run:
        state["__mtime"] = mtime_cache
        save_state(state)

    if profile:
        t_end = time.time()
        total_files = len(files)
        print(
            f"[profile] total_files={total_files} scanned={scanned} skipped_mtime={skipped_mtime} "
            f"sent={sent} list_glob={(t_files - t0):.3f}s process={(t_end - t_files):.3f}s "
            f"total={(t_end - t0):.3f}s",
            file=sys.stderr,
        )

    # Wave 7 fix (A4 P3-2): print dentro de collect_once pra cobrir watch mode.
    # Antes ficava em main() apos o return — unreachable quando --watch ativo.
    print(f"entries={'printed' if dry_run else 'sent'}:{sent}")
    return sent


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=0, help="Max entries to send/print; 0 means no limit.")
    parser.add_argument("--watch", action="store_true", help="Run continuously and send new Codex token events.")
    parser.add_argument("--interval", type=float, default=2.0, help="Watch polling interval in seconds.")
    parser.add_argument("--profile", action="store_true", help="Print timing/skip stats to stderr.")
    args = parser.parse_args()

    webhook = os.environ.get("TOKEN_TRACKER_WEBHOOK", DEFAULT_WEBHOOK)
    token = os.environ.get("TOKEN_TRACKER_TOKEN", "")

    if args.watch:
        while True:
            try:
                collect_once(webhook, token, dry_run=False, limit=0, profile=args.profile)
            except Exception as exc:
                print(f"watch error: {exc}", file=sys.stderr)
            time.sleep(max(args.interval, 0.5))

    collect_once(webhook, token, dry_run=args.dry_run, limit=args.limit, profile=args.profile)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
