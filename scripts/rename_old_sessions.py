"""
Rename Old Sessions — retro rename de sessions com nomes "funny" ou NULL.

Foca em sessions que JA TEM project_id mas ainda exibem funny-name
(ex: "fluffy-giggling-phoenix") ou custom_name NULL.
Tambem cobre sessions sem project mas com transcript localizavel.

Logica:
1. Lista sessions onde custom_name IS NULL e session_name bate padrao funny
2. Para cada session, tenta extrair primeira user message do transcript JSONL
3. Compoe novo nome: "{project_name}: {first_intent}" ou so "{first_intent}"
4. UPDATE sessions SET custom_name = $new WHERE custom_name IS NULL

Flags:
  --dry-run   Preview sem commitar nada no banco
  --limit N   Processa no maximo N sessions (default: ilimitado)
  --user-id   Filtra por user_id especifico (UUID)

DSN: postgresql://tracker:tracker@localhost:5433/claude_token_tracker
     ou env var DATABASE_URL
"""
import sys
import os
import re
import json
import argparse
import psycopg2
import psycopg2.extras

DSN = os.environ.get(
    "DATABASE_URL",
    "postgresql://tracker:tracker@localhost:5433/claude_token_tracker",
)

# Padrao funny-name: tres palavras minusculas separadas por hifen
FUNNY_PATTERN = re.compile(r"^[a-z]+-[a-z]+-[a-z]+$")

# Diretorio raiz dos transcripts do Claude Code
CLAUDE_PROJECTS_DIR = os.path.join(os.path.expanduser("~"), ".claude", "projects")


def find_transcript(session_id: str) -> str | None:
    """Procura JSONL de transcript em ~/.claude/projects/*/<session_id>.jsonl."""
    if not os.path.isdir(CLAUDE_PROJECTS_DIR):
        return None
    filename = session_id + ".jsonl"
    for project_dir in os.listdir(CLAUDE_PROJECTS_DIR):
        candidate = os.path.join(CLAUDE_PROJECTS_DIR, project_dir, filename)
        if os.path.isfile(candidate):
            return candidate
    return None


def extract_first_user_message(transcript_path: str) -> str | None:
    """Le o JSONL e retorna a primeira mensagem do usuario (ate 80 chars)."""
    if not transcript_path or not os.path.exists(transcript_path):
        return None
    try:
        with open(transcript_path, "r", encoding="utf-8") as f:
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

                msg = entry.get("message", {})
                role = msg.get("role") or entry.get("role", "")
                if role != "user":
                    continue

                content = msg.get("content") or entry.get("content", "")
                text = ""
                if isinstance(content, str):
                    text = content
                elif isinstance(content, list):
                    for block in content:
                        if isinstance(block, dict) and block.get("type") == "text":
                            text = block.get("text", "")
                            break
                        elif isinstance(block, str):
                            text = block
                            break

                text = " ".join(text.split()).strip()
                if text:
                    if len(text) > 80:
                        truncated = text[:77].rsplit(" ", 1)[0]
                        text = truncated + "..."
                    return text
    except Exception:
        pass
    return None


def compose_name(project_name: str | None, first_intent: str) -> str:
    """Compoe nome final no formato 'project: intent' ou so 'intent'."""
    if project_name:
        return f"{project_name}: {first_intent}"
    return first_intent


def run(dry_run: bool, limit: int | None, user_id_filter: str | None) -> None:
    conn = psycopg2.connect(DSN)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Busca sessions candidatas:
    # - custom_name IS NULL (nunca nomeada pelo auto_name)
    # - session_name bate padrao funny OU session_name IS NULL
    # Worker 1 (backfill_project_attribution) foca em sessions sem project.
    # Aqui foca em sessions COM ou SEM project que precisam de nome descritivo.
    filter_clause = ""
    params: list = []

    if user_id_filter:
        filter_clause = "AND user_id = %s"
        params.append(user_id_filter)

    limit_clause = ""
    if limit:
        limit_clause = f"LIMIT {int(limit)}"

    cur.execute(
        f"""
        SELECT
            s.session_id,
            s.custom_name,
            s.session_name,
            s.project_id,
            p.name AS project_name
        FROM sessions s
        LEFT JOIN projects p ON p.id = s.project_id
        WHERE s.custom_name IS NULL
          AND (
              s.session_name ~ '^[a-z]+-[a-z]+-[a-z]+$'
              OR s.session_name IS NULL
          )
          {filter_clause}
        ORDER BY s.last_seen DESC
        {limit_clause}
        """,
        params,
    )

    candidates = cur.fetchall()
    print(f"Encontradas {len(candidates)} sessions candidatas.")

    renamed = 0
    skipped_no_transcript = 0
    skipped_no_intent = 0

    for row in candidates:
        session_id = row["session_id"]
        project_name = row["project_name"]

        # Localiza transcript
        transcript_path = find_transcript(session_id)
        if not transcript_path:
            skipped_no_transcript += 1
            if dry_run:
                print(f"  [SKIP] {session_id[:12]}... — transcript nao encontrado")
            continue

        # Extrai primeira intent
        first_intent = extract_first_user_message(transcript_path)
        if not first_intent:
            skipped_no_intent += 1
            if dry_run:
                print(f"  [SKIP] {session_id[:12]}... — intent nao extraivel")
            continue

        new_name = compose_name(project_name, first_intent)

        if dry_run:
            print(f"  [DRY] {session_id[:12]}... → \"{new_name}\"")
        else:
            cur.execute(
                """
                UPDATE sessions
                SET custom_name = %s
                WHERE session_id = %s
                  AND custom_name IS NULL
                """,
                (new_name, session_id),
            )
            if cur.rowcount > 0:
                renamed += 1
                print(f"  [OK]  {session_id[:12]}... → \"{new_name}\"")
            else:
                # custom_name ja foi setado por outro processo (race ou worker 1)
                print(f"  [SKIP] {session_id[:12]}... — ja renomeado por outro processo")

    if not dry_run:
        conn.commit()

    print()
    print("=== Resumo ===")
    if dry_run:
        print(f"Modo DRY RUN — nenhuma alteracao commitada.")
        total_would_rename = len(candidates) - skipped_no_transcript - skipped_no_intent
        print(f"Renomearia: {total_would_rename}")
    else:
        print(f"Renomeadas: {renamed}")
    print(f"Sem transcript: {skipped_no_transcript}")
    print(f"Sem intent extraivel: {skipped_no_intent}")

    cur.close()
    conn.close()


def main():
    parser = argparse.ArgumentParser(
        description="Renomeia sessions antigas com funny-name ou sem nome descritivo."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview sem alterar o banco",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Numero maximo de sessions a processar",
    )
    parser.add_argument(
        "--user-id",
        type=str,
        default=None,
        help="Filtra por user_id UUID especifico",
    )
    args = parser.parse_args()

    run(
        dry_run=args.dry_run,
        limit=args.limit,
        user_id_filter=args.user_id,
    )


if __name__ == "__main__":
    main()
