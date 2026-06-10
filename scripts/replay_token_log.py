#!/usr/bin/env python
"""Replay de entries do token_log.jsonl pro webhook do tracker.

Uso: python replay_token_log.py [--since YYYY-MM-DD] [--model-substr fable] [--errors-only]

Por que existe: o hook claude_code_hook.py loga TODA entry localmente (com
cache tokens) e marca "_error" quando o POST falha (server down). Este script
re-envia: (a) entries com _error (nunca entraram no banco), e/ou (b) entries
de um modelo especifico (ex: corrigir pricing — deletar do banco e re-postar
pra recomputar cost_usd com a tabela nova).

Dedup: o server tem UNIQUE constraint (migration 019) + catch 23505 silencioso,
entao re-postar entry ja existente e inofensivo (vira no-op/duplicate).
"""
import argparse
import json
import os
import sys
import time
import urllib.request

LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "token_log.jsonl")
WEBHOOK = os.environ.get("TOKEN_TRACKER_WEBHOOK", "http://localhost:3002/api/webhook/track-tokens")
TOKEN = os.environ.get("TOKEN_TRACKER_TOKEN", "")

SEND_FIELDS = [
    "timestamp", "source", "model", "input_tokens", "output_tokens",
    "cache_read_tokens", "cache_write_tokens", "session_id",
    "auto_name", "session_name", "project", "cwd",
]


def post(payload: dict) -> tuple[bool, str]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        WEBHOOK, data=data, method="POST",
        headers={"Content-Type": "application/json", "X-Webhook-Token": TOKEN},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return True, resp.read().decode("utf-8")[:120]
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")[:120]
        # 409/duplicate = ok (dedup)
        return (e.code in (200, 201, 409)), f"HTTP {e.code} {body}"
    except Exception as e:  # noqa: BLE001
        return False, str(e)[:120]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", default="", help="so timestamps >= YYYY-MM-DD")
    ap.add_argument("--model-substr", default="", help="filtra model contendo substring")
    ap.add_argument("--errors-only", action="store_true", help="so linhas com _error")
    args = ap.parse_args()

    if not TOKEN:
        print("TOKEN_TRACKER_TOKEN nao definido no env.")
        return 1

    sent = ok = dup = fail = 0
    with open(LOG_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if args.since and str(entry.get("timestamp", "")) < args.since:
                continue
            if args.model_substr and args.model_substr not in str(entry.get("model", "")):
                continue
            if args.errors_only and "_error" not in entry:
                continue
            payload = {k: entry[k] for k in SEND_FIELDS if k in entry and entry[k] not in (None, "")}
            success, msg = post(payload)
            sent += 1
            if success:
                if "duplicate" in msg.lower() or "409" in msg:
                    dup += 1
                else:
                    ok += 1
            else:
                fail += 1
                print(f"FAIL {entry.get('timestamp')} {entry.get('model')}: {msg}")
            time.sleep(0.03)

    print(f"replay done: sent={sent} ok={ok} dup={dup} fail={fail}")
    return 0 if fail == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
