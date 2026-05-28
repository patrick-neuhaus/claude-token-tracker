"""
Backfill Retro Project Attribution
===================================
Atribui project_id retroativamente para sessões claude-code que ficaram com project_id = NULL.

Lógica:
  1. Lê ~/.claude/projects/ — cada subdir é um projeto com path encodado
  2. Decoda dirname -> project_name (basename do cwd real)
  3. Para cada *.jsonl no subdir, extrai session_id do filename
  4. Extrai first_intent da primeira mensagem do usuário no jsonl
  5. No DB: resolve/cria project, atualiza sessions.project_id e sessions.session_name

Como rodar:
  Dry-run (vê o que seria feito, sem modificar DB):
    python scripts/backfill_project_attribution.py --dry-run

  Aplicar (modifica DB — autorizado por Patrick):
    python scripts/backfill_project_attribution.py

Reversibilidade:
  Para desfazer TUDO que este script atribuiu:
    UPDATE sessions SET project_id = NULL, session_name = NULL
    WHERE source='claude-code' AND project_id IS NOT NULL
    AND session_name IS NOT NULL;
  ATENÇÃO: isso apaga também sessões que tinham project antes do backfill.
  Use com cuidado — só faça se quiser resetar tudo.

Idempotência:
  Re-rodar o script é seguro. Não duplica projetos (SELECT first).
  Não sobrescreve project_id já preenchido (WHERE project_id IS NULL).
  Não sobrescreve session_name já preenchido (COALESCE(NULLIF(name, ''), ...)).
"""

import os
import sys
import json
import re
import argparse
import psycopg2
from psycopg2.extras import RealDictCursor

# =============================================
# CONFIG
# =============================================
PROJECTS_DIR = os.path.expanduser("~/.claude/projects")
DSN = os.environ.get(
    "BACKFILL_DSN",
    "postgresql://tracker:tracker_local_2026@localhost:5433/claude_token_tracker"
)
FIRST_INTENT_MAX = 80

# Segmentos de path que são ruído e devem ser ignorados no decode do project_name
PATH_NOISE = {
    "C", "D", "E",  # drive letters
    "Users", "User",
    "WINDOWS", "Windows",
    "DOCUMENTOS", "Documents",
    "Desktop",
    # Comum no setup do Patrick:
    "Patrick", "Neuhaus",
    "Github", "GitHub",
    # Segmentos vazios (de '--')
    "",
}

# Sufixos de worktree gerados pelo Claude Code
WORKTREE_PATTERN = re.compile(r'--claude-worktrees?-[\w-]+$')


def decode_project_name(dirname: str) -> str:
    """
    Decoda dirname encodado para project_name (basename do cwd real).

    Pattern de encoding do Claude Code:
      - '/' vira '-'
      - ':' (drive separator) vira '--'
    Exemplo:
      C--Users-Patrick-Neuhaus-Documents-Github-skillforge-arsenal
      -> cwd: C:/Users/Patrick Neuhaus/Documents/Github/skillforge-arsenal
      -> project_name: skillforge-arsenal

    Heurística:
      1. Remove sufixo de worktree se existir (--claude-worktrees-hash)
      2. Split por '-'
      3. Pega o último segmento não-ruído
      4. Fallback: último segmento do split
    """
    # Remove worktree suffix
    cleaned = WORKTREE_PATTERN.sub('', dirname).rstrip('-')

    # Split pelo separador
    parts = cleaned.split('-')

    # Pega último segmento que não é ruído
    for part in reversed(parts):
        if part and part not in PATH_NOISE:
            return part

    # Fallback: último segmento não-vazio
    non_empty = [p for p in parts if p]
    return non_empty[-1] if non_empty else dirname


def extract_first_intent(jsonl_path: str) -> str:
    """
    Lê o jsonl e retorna a primeira mensagem do usuário (até FIRST_INTENT_MAX chars).

    Suporta dois formatos observados nos jsonl do Claude:
      1. {"type": "queue-operation", "operation": "enqueue", ..., "content": "..."}
      2. {"type": "user", "message": {"role": "user", "content": "..."}}
         ou {"role": "user", "content": "..."}
    """
    try:
        with open(jsonl_path, 'r', encoding='utf-8', errors='replace') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue

                if not isinstance(obj, dict):
                    continue

                text = None

                # Formato 1: queue-operation enqueue
                if obj.get('type') == 'queue-operation' and obj.get('operation') == 'enqueue':
                    text = obj.get('content', '')

                # Formato 2: message with role=user
                elif obj.get('type') == 'user' or obj.get('role') == 'user':
                    msg = obj.get('message', obj)
                    content = msg.get('content', '')
                    if isinstance(content, str):
                        text = content
                    elif isinstance(content, list):
                        for block in content:
                            if isinstance(block, dict) and block.get('type') == 'text':
                                text = block.get('text', '')
                                break

                if text:
                    text = text.strip().replace('\n', ' ')
                    if len(text) > FIRST_INTENT_MAX:
                        text = text[:FIRST_INTENT_MAX - 3].rsplit(' ', 1)[0] + '...'
                    return text

    except (OSError, IOError):
        pass

    return ''



def backfill(dry_run: bool = False):
    """Executa o backfill completo."""

    print(f"=== Backfill Retro Project Attribution {'[DRY-RUN]' if dry_run else '[APPLY]'} ===")
    print(f"Projects dir: {PROJECTS_DIR}")
    print(f"DB: {DSN}")
    print()

    if not os.path.isdir(PROJECTS_DIR):
        print(f"ERRO: {PROJECTS_DIR} não encontrado")
        sys.exit(1)

    # Conecta ao DB
    try:
        conn = psycopg2.connect(DSN)
        conn.autocommit = False
    except Exception as e:
        print(f"ERRO ao conectar DB: {e}")
        sys.exit(1)

    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Pega todos users
    cur.execute("SELECT id, email FROM users")
    users = {row['id']: row['email'] for row in cur.fetchall()}
    print(f"Users encontrados: {len(users)}")
    for uid, email in users.items():
        print(f"  {uid} | {email}")
    print()

    # Pega todas sessões do DB sem project_id (source=claude-code)
    cur.execute("""
        SELECT id, user_id, session_id, session_name
        FROM sessions
        WHERE source = 'claude-code' AND project_id IS NULL
    """)
    sessions_without_project = {row['session_id']: row for row in cur.fetchall()}
    print(f"Sessões claude-code sem project_id no DB: {len(sessions_without_project)}")
    print()

    # Counters
    sessions_processed = 0
    sessions_updated = 0
    sessions_named = 0
    projects_created = 0
    # Rastreia (user_id, project_name) já vistos em dry-run para deduplicar contador
    _dry_run_seen_projects: set = set()

    # Itera projetos
    project_dirs = [
        d for d in os.listdir(PROJECTS_DIR)
        if os.path.isdir(os.path.join(PROJECTS_DIR, d))
    ]

    print(f"Project dirs encontrados: {len(project_dirs)}")

    for dirname in sorted(project_dirs):
        project_dir = os.path.join(PROJECTS_DIR, dirname)
        project_name = decode_project_name(dirname)

        # Lista jsonl (sessões diretas, não subagents)
        try:
            all_files = os.listdir(project_dir)
        except OSError:
            continue

        jsonl_files = [
            f for f in all_files
            if f.endswith('.jsonl') and not f.startswith('.')
        ]

        if not jsonl_files:
            continue

        print(f"\n[{dirname}]")
        print(f"  project_name: '{project_name}' | {len(jsonl_files)} sessões")

        for jsonl_file in jsonl_files:
            session_id = jsonl_file[:-6]  # Remove .jsonl

            sessions_processed += 1

            # Só processa sessões que estão no DB sem project_id
            if session_id not in sessions_without_project:
                continue

            session_row = sessions_without_project[session_id]
            user_id = str(session_row['user_id'])
            db_session_name = session_row['session_name'] or ''

            jsonl_path = os.path.join(project_dir, jsonl_file)
            first_intent = extract_first_intent(jsonl_path)

            # Monta novo session_name
            new_session_name = None
            if first_intent:
                new_session_name = f"{project_name}: {first_intent}"

            # Verifica se projeto já existe (antes de criar)
            cur.execute(
                "SELECT id FROM projects WHERE user_id = %s AND name = %s",
                (user_id, project_name)
            )
            existing_proj = cur.fetchone()
            is_new_project = existing_proj is None

            if dry_run:
                proj_key = (user_id, project_name)
                if is_new_project and proj_key not in _dry_run_seen_projects:
                    projects_created += 1
                    _dry_run_seen_projects.add(proj_key)
                sessions_updated += 1
                if new_session_name and not db_session_name:
                    sessions_named += 1

                name_preview = ''
                if new_session_name:
                    safe_name = new_session_name[:50].encode('ascii', 'replace').decode('ascii')
                    name_preview = f" name='{safe_name}...'"
                print(f"  WOULD UPDATE session {session_id[:8]}... -> project='{project_name}'{name_preview}")
            else:
                # Apply real — resolve/cria projeto
                if existing_proj:
                    project_id = existing_proj['id']
                else:
                    cur.execute(
                        "INSERT INTO projects (user_id, name) VALUES (%s, %s) RETURNING id",
                        (user_id, project_name)
                    )
                    project_id = cur.fetchone()['id']
                    projects_created += 1

                # UPDATE sessions
                if new_session_name and not db_session_name:
                    cur.execute("""
                        UPDATE sessions
                        SET project_id = %s,
                            session_name = COALESCE(NULLIF(session_name, ''), %s)
                        WHERE session_id = %s AND user_id = %s AND project_id IS NULL
                    """, (project_id, new_session_name, session_id, user_id))
                    sessions_named += 1
                else:
                    cur.execute("""
                        UPDATE sessions
                        SET project_id = %s
                        WHERE session_id = %s AND user_id = %s AND project_id IS NULL
                    """, (project_id, session_id, user_id))

                if cur.rowcount > 0:
                    sessions_updated += 1
                    name_part = ''
                    if new_session_name:
                        safe_name = new_session_name[:50].encode('ascii', 'replace').decode('ascii')
                        name_part = f" | name='{safe_name}'"
                    print(f"  UPDATED session {session_id[:8]}... -> project='{project_name}'{name_part}")

    # Commit ou rollback
    if dry_run:
        conn.rollback()
        print("\n[DRY-RUN] Nenhuma mudança aplicada.")
    else:
        conn.commit()
        print("\n[APPLY] Mudanças commitadas.")

    cur.close()
    conn.close()

    # Relatório final
    print("\n" + "=" * 50)
    print("RELATÓRIO FINAL")
    print("=" * 50)
    print(f"  Sessions processadas (jsonl encontrados): {sessions_processed}")
    print(f"  Sessions atualizadas com project_id:      {sessions_updated}")
    print(f"  Sessions com session_name atribuído:      {sessions_named}")
    print(f"  Novos projects criados:                   {projects_created}")
    if dry_run:
        print("\n  (dry-run — nada foi modificado no DB)")
    print("=" * 50)


def main():
    parser = argparse.ArgumentParser(
        description="Backfill retro de project_id para sessões claude-code sem projeto."
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help="Simula sem modificar o DB. Mostra o que seria feito."
    )
    args = parser.parse_args()
    backfill(dry_run=args.dry_run)


if __name__ == '__main__':
    main()
