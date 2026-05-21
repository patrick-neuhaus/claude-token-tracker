"""
Claude Code Stop Hook - Token Tracker
Le o transcript JSONL apos cada resposta e envia CADA chamada API individualmente.
"""
import sys
import json
import os
import tempfile
from urllib.request import urlopen, Request
from datetime import datetime, timezone

# =============================================
# URL DO SERVIDOR LOCAL
# (ou defina as env vars TOKEN_TRACKER_WEBHOOK e TOKEN_TRACKER_TOKEN)
# =============================================
WEBHOOK_URL = os.environ.get(
    'TOKEN_TRACKER_WEBHOOK',
    'http://localhost:3002/api/webhook/track-tokens'
)
# Wave 1 hardening: NUNCA hardcode token aqui. Sem env var = nao envia.
WEBHOOK_TOKEN = os.environ.get('TOKEN_TRACKER_TOKEN', '')
# =============================================

LOG_DIR = os.environ.get('TOKEN_TRACKER_LOG_DIR') or os.path.dirname(os.path.abspath(__file__))
SENT_FILE = os.path.join(LOG_DIR, '.last_sent_line.json')

# DEBUG: set TOKEN_TRACKER_DEBUG=1 pra logar exceptions silenciadas (A4 P3-4).
# Sem isso, encoding issue / path traversal / JSON malformed somem sem rastro.
DEBUG = os.environ.get('TOKEN_TRACKER_DEBUG', '').lower() in ('1', 'true', 'yes')

# Warn no boot se LOG_DIR nao-writable (junction read-only, symlink quebrado).
# Sem isso, atomic_write_json falha silencioso e state file nunca persiste.
if not os.access(LOG_DIR, os.W_OK):
    sys.stderr.write(f"[claude_code_hook] WARN: LOG_DIR not writable: {LOG_DIR}\n")


def atomic_write_json(path, data):
    """Atomic write via temp + rename. Race-safe em parallel sessions.

    os.replace e atomic em Windows e Unix (Python 3.3+).
    Sem deps externas (portalocker, fcntl, msvcrt) - stdlib only.
    """
    directory = os.path.dirname(os.path.abspath(path))
    fd, tmp_path = tempfile.mkstemp(prefix='.last_sent_', suffix='.tmp', dir=directory)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, path)
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def get_last_sent_line(session_id):
    """Retorna a ultima linha ja enviada para esta sessao.

    Robusto contra state file corrompido (truncated, invalid JSON):
    retorna 0 ao inves de crashar.
    """
    if not os.path.exists(SENT_FILE):
        return 0
    try:
        with open(SENT_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return 0
        return data.get(session_id, 0)
    except (json.JSONDecodeError, OSError, ValueError):
        return 0
    except Exception:
        return 0


def save_last_sent_line(session_id, line_num):
    """Salva a ultima linha enviada para esta sessao via atomic write.

    Race-safe em parallel Claude sessions (Patrick autoriza varias paralelas).
    Se file corrompido na leitura, parte de {} ao inves de crashar.
    """
    data = {}
    if os.path.exists(SENT_FILE):
        try:
            with open(SENT_FILE, 'r', encoding='utf-8') as f:
                loaded = json.load(f)
            if isinstance(loaded, dict):
                data = loaded
        except (json.JSONDecodeError, OSError, ValueError):
            data = {}
        except Exception:
            data = {}
    data[session_id] = line_num
    atomic_write_json(SENT_FILE, data)


def extract_auto_name(transcript_path, project_name=None):
    """Extrai o nome automatico da sessao a partir da primeira mensagem do usuario.
    Se project_name estiver disponivel, formato: 'project: first_intent'.
    """
    if not transcript_path or not os.path.exists(transcript_path):
        return None
    try:
        with open(transcript_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if not isinstance(entry, dict):
                    continue

                # Formato: {"type": "human", "message": {"role": "user", "content": ...}}
                msg = entry.get('message', {})
                role = msg.get('role') or entry.get('role', '')
                if role != 'user':
                    continue

                content = msg.get('content') or entry.get('content', '')

                # content pode ser string ou lista de blocos
                text = ''
                if isinstance(content, str):
                    text = content
                elif isinstance(content, list):
                    for block in content:
                        if isinstance(block, dict) and block.get('type') == 'text':
                            text = block.get('text', '')
                            break
                        elif isinstance(block, str):
                            text = block
                            break

                text = text.strip()
                if text:
                    # Remove quebras de linha
                    text = ' '.join(text.split())
                    if project_name:
                        # Formato: "project_name: first_intent_truncated_80"
                        prefix = project_name + ': '
                        max_intent = 80
                        if len(text) > max_intent:
                            text = text[:max_intent - 3].rsplit(' ', 1)[0] + '...'
                        return prefix + text if text else None
                    else:
                        # Fallback: apenas a intent truncada em 80
                        if len(text) > 80:
                            text = text[:77].rsplit(' ', 1)[0] + '...'
                        return text if text else None
    except Exception as e:
        if DEBUG:
            sys.stderr.write(f"[claude_code_hook] extract_auto_name failed: {e!r}\n")
    return None


def extract_session_name(session_id):
    """
    Tenta descobrir o 'funny name' da sessao (ex: fluffy-giggling-phoenix)
    via plan files em ~/.claude/plans/. Retorna None se nao conseguir.
    Falha silenciosamente — nunca quebra o envio de tokens.
    """
    try:
        if not session_id:
            return None
        home = os.path.expanduser('~')
        sessions_dir = os.path.join(home, '.claude', 'sessions')
        plans_dir = os.path.join(home, '.claude', 'plans')

        # 1. Acha startedAt da sessao atual em ~/.claude/sessions/<pid>.json
        started_at_ms = None
        if os.path.isdir(sessions_dir):
            for fname in os.listdir(sessions_dir):
                if not fname.endswith('.json'):
                    continue
                try:
                    with open(os.path.join(sessions_dir, fname), 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    if data.get('sessionId') == session_id:
                        started_at_ms = data.get('startedAt')
                        break
                except Exception:
                    continue

        if started_at_ms is None:
            return None

        started_at_s = started_at_ms / 1000.0

        # 2. Acha plan files modificados durante a sessao (exclui agent variants)
        if not os.path.isdir(plans_dir):
            return None

        candidates = []
        for fname in os.listdir(plans_dir):
            if not fname.endswith('.md'):
                continue
            if '-agent-' in fname:
                continue
            fpath = os.path.join(plans_dir, fname)
            try:
                mtime = os.path.getmtime(fpath)
            except OSError:
                continue
            if mtime >= started_at_s:
                candidates.append((mtime, fname[:-3]))

        if not candidates:
            return None

        # 3. Mais recente = sessao atual
        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1]
    except Exception as e:
        if DEBUG:
            sys.stderr.write(f"[claude_code_hook] extract_session_name failed: {e!r}\n")
        return None


def normalize_timestamp(ts_raw):
    """Normaliza timestamp do transcript para ISO 8601 com TZ UTC.

    Aceita:
      - string ISO 8601 (com Z ou +offset)
      - string ISO 8601 naive (sem TZ) -> assume UTC
      - int/float (epoch seconds ou ms)
      - None -> retorna None (caller decide fallback)
    """
    if ts_raw is None:
        return None
    # Numeric epoch
    if isinstance(ts_raw, (int, float)):
        try:
            # Heuristica: se > 10^12, e milliseconds
            ts_val = ts_raw / 1000.0 if ts_raw > 1e12 else ts_raw
            return datetime.fromtimestamp(ts_val, tz=timezone.utc).isoformat()
        except (ValueError, OSError, OverflowError):
            return None
    # String ISO 8601
    if isinstance(ts_raw, str):
        ts_str = ts_raw.strip()
        if not ts_str:
            return None
        try:
            # Python 3.11+ aceita Z; 3.10 nao. Normaliza Z -> +00:00 pra compat
            normalized = ts_str.replace('Z', '+00:00')
            dt = datetime.fromisoformat(normalized)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.isoformat()
        except (ValueError, TypeError):
            # Aceita string opaca se nao parsear (server pode tolerar)
            return ts_str
    return None


def extract_usage_entries(transcript_path, skip_lines=0):
    """Le o JSONL e retorna TODAS as chamadas API individuais das linhas novas.

    Cada entry inclui o timestamp da linha do transcript (nao datetime.now).
    Isso garante que re-runs com state file zerado batam no unique index
    idx_unique_token_entry (que inclui timestamp na tuple).
    """
    if not transcript_path or not os.path.exists(transcript_path):
        return [], 0

    entries = []
    model = None
    line_count = 0

    with open(transcript_path, 'r', encoding='utf-8') as f:
        for line in f:
            line_count += 1
            if line_count <= skip_lines:
                continue

            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            if not isinstance(entry, dict):
                continue

            # Extrai model
            for key in ['model', 'activeModel']:
                if key in entry and entry[key]:
                    model = entry[key]

            # Tenta extrair usage de message.usage (formato principal)
            usage = None
            msg = {}

            if 'message' in entry and isinstance(entry.get('message'), dict):
                msg = entry['message']
                if 'usage' in msg:
                    usage = msg['usage']
                if 'model' in msg:
                    model = msg['model']
            elif 'usage' in entry:
                usage = entry['usage']

            # Formato camelCase (fallback)
            if 'inputTokens' in entry:
                usage = {
                    'input_tokens': entry.get('inputTokens', 0),
                    'output_tokens': entry.get('outputTokens', 0),
                    'cache_read_input_tokens': entry.get('cacheReadInputTokens', 0),
                    'cache_creation_input_tokens': entry.get('cacheCreationInputTokens', 0),
                }

            # DEDUP: só conta entries com stop_reason (resultado final da API call).
            # Streaming chunks intermediários têm stop_reason=None e usage idêntico.
            stop_reason = msg.get('stop_reason') or entry.get('stop_reason')
            if usage and not stop_reason:
                continue

            if usage and isinstance(usage, dict):
                inp = usage.get('input_tokens', 0) or 0
                out = usage.get('output_tokens', 0) or 0
                cr = usage.get('cache_read_input_tokens', 0) or 0
                cw = usage.get('cache_creation_input_tokens', 0) or 0
                if inp > 0 or out > 0:
                    # Extrai timestamp da entry do transcript (root level).
                    # Fallback: msg.timestamp se houver, depois None (caller decide).
                    ts_raw = entry.get('timestamp') or msg.get('timestamp')
                    entry_ts = normalize_timestamp(ts_raw)
                    entries.append({
                        'model': model,
                        'input_tokens': inp,
                        'output_tokens': out,
                        'cache_read_tokens': cr,
                        'cache_write_tokens': cw,
                        'timestamp': entry_ts,
                    })

    return entries, line_count


def send_to_webhook(data):
    """Envia dados para o servidor local via webhook."""
    try:
        payload = json.dumps(data).encode('utf-8')
        headers = {'Content-Type': 'application/json'}
        if WEBHOOK_TOKEN:
            headers['X-Webhook-Token'] = WEBHOOK_TOKEN
        req = Request(
            WEBHOOK_URL,
            data=payload,
            headers=headers,
            method='POST'
        )
        with urlopen(req, timeout=10):
            pass
    except Exception as e:
        log_path = os.path.join(LOG_DIR, 'token_log.jsonl')
        with open(log_path, 'a', encoding='utf-8') as f:
            data['_error'] = str(e)
            f.write(json.dumps(data) + '\n')


def main():
    # Fail-fast se TOKEN_TRACKER_TOKEN ausente: warn no stderr + exit 0
    # (nao crasha o Claude Code, so pula o envio).
    if not WEBHOOK_TOKEN:
        sys.stderr.write(
            "[claude_code_hook] TOKEN_TRACKER_TOKEN env var missing, skipping\n"
        )
        sys.exit(0)

    try:
        hook_input = json.loads(sys.stdin.read())
    except Exception:
        sys.exit(0)

    # BUG-FIX: session_id SEMPRE vem do hook_input payload (Claude Code PostStop).
    # NUNCA extrair do conteudo do transcript — isso gerava session_ids "fantasma"
    # (IDs internos do JSONL que nao batem com o session real do Claude Code).
    session_id = hook_input.get('session_id', '')
    transcript_path = hook_input.get('transcript_path', '')
    cwd = hook_input.get('cwd', '')
    project_name = os.path.basename(cwd) if cwd else None

    skip_lines = get_last_sent_line(session_id)
    entries, total_lines = extract_usage_entries(transcript_path, skip_lines)

    # Extrai nome automatico apenas na primeira vez (skip_lines == 0)
    auto_name = None
    if skip_lines == 0:
        auto_name = extract_auto_name(transcript_path, project_name)

    # Funny name (ex: fluffy-giggling-phoenix) — chamado a cada hook fire
    # porque o plan file pode ser criado em qualquer momento da sessao.
    # Backend so atualiza se session_name estiver NULL (COALESCE).
    session_name = extract_session_name(session_id)

    # Fallback timestamp se entry do transcript nao tiver (idealmente nunca usado).
    fallback_now = datetime.now(timezone.utc).isoformat()

    for entry in entries:
        # Prioriza timestamp da linha do transcript (estavel entre re-runs).
        # Fallback datetime.now() com warn no stderr - so deve disparar se
        # transcript estiver malformado.
        entry_ts = entry.get('timestamp')
        if not entry_ts:
            sys.stderr.write(
                "[claude_code_hook] WARN: entry sem timestamp no transcript, "
                "usando datetime.now() (pode quebrar dedup se state file zerar)\n"
            )
            entry_ts = fallback_now

        payload = {
            'timestamp': entry_ts,
            'source': 'claude-code',
            'model': entry.get('model') or 'unknown',
            'input_tokens': entry['input_tokens'],
            'output_tokens': entry['output_tokens'],
            'cache_read_tokens': entry.get('cache_read_tokens', 0),
            'cache_write_tokens': entry.get('cache_write_tokens', 0),
            'session_id': session_id,
            'conversation_url': ''
        }
        if auto_name:
            payload['auto_name'] = auto_name
        if session_name:
            payload['session_name'] = session_name
        if project_name:
            payload['project'] = project_name
        if cwd:
            payload['cwd'] = cwd
        send_to_webhook(payload)

    save_last_sent_line(session_id, total_lines)


if __name__ == '__main__':
    main()
