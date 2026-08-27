"""
Backfill de subagentes - Token Tracker.

O hook Stop (claude_code_hook.py) le apenas o transcript da sessao principal.
Os subagentes gravam em arquivos separados sob:

    ~/.claude/projects/<projeto>/<uuid-do-pai>/subagents/**/agent-*.jsonl

Este script varre esses arquivos, extrai as chamadas de API com a MESMA regra
de dedup do hook (extract_usage_entries, importado - nao copiado) e envia para
o webhook. Tambem serve de gate offline: com --dry-run --stats ele so conta.

session_id derivado = "<uuid-do-pai>:<nome-do-arquivo-sem-extensao>"
    ex.: 683ea405-9da4-4f05-a521-7875a8f44bc7:agent-a4b8d92acbedae2b6

Por que derivar do nome do arquivo: o JSONL do subagente carrega o sessionId
DO PAI (com isSidechain: true), entao o conteudo nao identifica o subagente.

Uso:
    python backfill_subagents.py --dry-run --stats
    python backfill_subagents.py --dry-run --stats --limit 20
    python backfill_subagents.py                      # envia de verdade
    python backfill_subagents.py --incremental        # so as linhas novas
"""
import argparse
import json
import os
import sys

# Import (nao copia) do hook: extract_usage_entries carrega a regra de dedup
# correta - conta so linha com stop_reason preenchido. Linhas intermediarias
# da mesma resposta trazem output_tokens parcial.
#
# find_subagent_files / derive_subagent_session_id / build_payload tambem vem
# do hook de proposito: os dois PRECISAM concordar na chave, senao o state
# file e o banco ficam com dois ids diferentes pro mesmo subagente.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from claude_code_hook import (  # noqa: E402
    SUBAGENT_DIR_NAME,
    WEBHOOK_TOKEN,
    build_payload,
    derive_subagent_session_id,
    extract_usage_entries,
    find_subagent_files,
    get_last_sent_line,
    save_last_sent_line,
    send_to_webhook,
)

DEFAULT_ROOT = os.path.join(os.path.expanduser('~'), '.claude', 'projects')

# Teto de linhas lidas do transcript pai so pra achar o cwd. Os pais medidos
# expoem cwd nas primeiras dezenas de linhas; o teto evita varrer um JSONL de
# centenas de MB quando o campo nao existe.
PARENT_CWD_SCAN_LIMIT = 5000


def find_all_subagent_files(root):
    """Todos os agent-*.jsonl sob qualquer pasta subagents/ abaixo de root.

    A regra de qual arquivo conta vive em find_subagent_files (hook) — aqui
    so achamos as pastas subagents/ e delegamos, pra nao ter duas definicoes.
    """
    found = []
    for dirpath, dirnames, _filenames in os.walk(root):
        if SUBAGENT_DIR_NAME in dirnames:
            found.extend(
                find_subagent_files(os.path.join(dirpath, SUBAGENT_DIR_NAME))
            )
            # Ja coberta recursivamente por find_subagent_files.
            dirnames.remove(SUBAGENT_DIR_NAME)
    found.sort()
    return found


def parent_transcript_path(subagent_file):
    """Resolve o transcript pai a partir do caminho do arquivo de subagente.

    O componente do caminho imediatamente antes de 'subagents' e o UUID da
    sessao pai, e '<esse caminho>.jsonl' e o transcript principal.
    Retorna None se o caminho nao tiver o formato esperado.
    """
    parts = os.path.normpath(os.path.abspath(subagent_file)).split(os.sep)
    if SUBAGENT_DIR_NAME not in parts:
        return None
    idx = parts.index(SUBAGENT_DIR_NAME)
    if idx == 0:
        return None
    return os.sep.join(parts[:idx]) + '.jsonl'


def read_cwd(transcript_path, line_limit=PARENT_CWD_SCAN_LIMIT):
    """Primeiro 'cwd' nao-vazio do transcript. None se nao houver."""
    if not transcript_path or not os.path.exists(transcript_path):
        return None
    try:
        with open(transcript_path, 'r', encoding='utf-8') as f:
            for n, line in enumerate(f):
                if n >= line_limit:
                    break
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if isinstance(entry, dict) and entry.get('cwd'):
                    return entry['cwd']
    except OSError:
        return None
    return None


def parent_context(subagent_file, cache):
    """(cwd, project) herdados do pai. Cache por transcript pai.

    Fallback: se o pai nao expuser cwd, usa o cwd do proprio arquivo de
    subagente - ele carrega o mesmo valor em toda linha.
    """
    parent = parent_transcript_path(subagent_file)
    if parent not in cache:
        cwd = read_cwd(parent)
        cache[parent] = cwd
    cwd = cache[parent]
    if not cwd:
        cwd = read_cwd(subagent_file, line_limit=50)
    project = os.path.basename(cwd.rstrip('\\/')) if cwd else None
    return cwd, project


def collect(root, limit=None, incremental=False):
    """Varre os arquivos de subagente e monta as entradas prontas pro webhook.

    Retorna (items, stats). Cada item:
        {'session_id', 'cwd', 'project', 'file', 'total_lines', 'entries'}
    """
    files = find_all_subagent_files(root)
    if limit is not None:
        files = files[:limit]

    cache = {}
    items = []
    stats = {
        'files_scanned': 0,
        'files_without_usage': 0,
        'files_unresolved': 0,
        'entries': 0,
        'input': 0,
        'output': 0,
        'cache_read': 0,
        'cache_write': 0,
    }

    for path in files:
        stats['files_scanned'] += 1
        session_id = derive_subagent_session_id(path)
        if not session_id:
            stats['files_unresolved'] += 1
            continue

        skip_lines = get_last_sent_line(session_id) if incremental else 0
        entries, total_lines = extract_usage_entries(path, skip_lines)

        if not entries:
            stats['files_without_usage'] += 1
            # Sem entries ainda avanca o ponteiro: as linhas foram lidas.
            items.append({
                'session_id': session_id,
                'cwd': None,
                'project': None,
                'file': path,
                'total_lines': total_lines,
                'entries': [],
            })
            continue

        cwd, project = parent_context(path, cache)
        for e in entries:
            stats['entries'] += 1
            stats['input'] += e['input_tokens']
            stats['output'] += e['output_tokens']
            stats['cache_read'] += e.get('cache_read_tokens', 0)
            stats['cache_write'] += e.get('cache_write_tokens', 0)

        items.append({
            'session_id': session_id,
            'cwd': cwd,
            'project': project,
            'file': path,
            'total_lines': total_lines,
            'entries': entries,
        })

    return items, stats


def main():
    parser = argparse.ArgumentParser(
        description='Backfill das chamadas de API dos subagentes do Claude Code.'
    )
    parser.add_argument('--root', default=DEFAULT_ROOT,
                        help='raiz dos transcripts (default: ~/.claude/projects)')
    parser.add_argument('--dry-run', action='store_true',
                        help='nao envia nada e nao grava o state file')
    parser.add_argument('--limit', type=int, default=None,
                        help='processa no maximo N arquivos')
    parser.add_argument('--stats', action='store_true',
                        help='imprime o resumo agregado no fim')
    parser.add_argument('--incremental', action='store_true',
                        help='pula as linhas ja enviadas (.last_sent_line.json); '
                             'sem isso, varre o arquivo inteiro')
    args = parser.parse_args()

    if not os.path.isdir(args.root):
        sys.stderr.write('[backfill_subagents] root nao encontrada: %s\n' % args.root)
        sys.exit(1)

    if not args.dry_run and not WEBHOOK_TOKEN:
        sys.stderr.write(
            '[backfill_subagents] TOKEN_TRACKER_TOKEN ausente - use --dry-run '
            'ou defina a env var\n'
        )
        sys.exit(1)

    items, stats = collect(args.root, limit=args.limit, incremental=args.incremental)

    from datetime import datetime, timezone
    fallback_ts = datetime.now(timezone.utc).isoformat()

    sent = 0
    for item in items:
        for entry in item['entries']:
            payload = build_payload(
                entry,
                item['session_id'],
                project=item['project'],
                cwd=item['cwd'],
                fallback_ts=fallback_ts,
            )
            if args.dry_run:
                print(json.dumps(payload, ensure_ascii=False))
            else:
                send_to_webhook(payload)
            sent += 1
        if not args.dry_run:
            save_last_sent_line(item['session_id'], item['total_lines'])

    if args.stats:
        out = sys.stderr if args.dry_run else sys.stdout
        out.write('\n=== backfill_subagents %s ===\n'
                  % ('DRY-RUN' if args.dry_run else 'SENT'))
        out.write('root ................. %s\n' % args.root)
        out.write('modo ................. %s\n'
                  % ('incremental' if args.incremental else 'varredura completa'))
        out.write('arquivos varridos .... %d\n' % stats['files_scanned'])
        out.write('sem usage ............ %d\n' % stats['files_without_usage'])
        out.write('caminho nao resolvido  %d\n' % stats['files_unresolved'])
        out.write('entradas ............. %d\n' % stats['entries'])
        out.write('input ................ %d\n' % stats['input'])
        out.write('output ............... %d\n' % stats['output'])
        out.write('cache_read ........... %d\n' % stats['cache_read'])
        out.write('cache_write .......... %d\n' % stats['cache_write'])
        out.write('%s ......... %d\n'
                  % ('payloads impressos' if args.dry_run else 'payloads enviados', sent))


if __name__ == '__main__':
    main()
