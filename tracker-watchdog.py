#!/usr/bin/env python3
# tracker-watchdog.py - garante o claude-token-tracker no ar. SEM janela (rodar via pythonw.exe).
#
# Scheduled task time-based (~3min). Se :3002/health nao responde, sobe o server
# via launcher silencioso. Resident RAM = 0 entre ticks (processo curto, nao daemon);
# pico ~15-20MB por <1s no tick, liberado na hora. Mesmo padrao do codex collector.
#
# Windowless: pythonw (subsistema GUI) + CREATE_NO_WINDOW no spawn do wscript.
# So abre processo de launch QUANDO o server esta down (reboot/crash) - operacao
# normal (server up) e so um GET + exit, invisivel.
#
# Porta do banco (10/10/2026). Falha medida em 09/10/2026: o Docker Desktop subiu
# as 08:21:16 e religou o encaminhamento 127.0.0.1:5433 do container, que ele
# mesmo sobe pela restart policy. 150 ms depois, o `docker start` do
# start-tracker.bat pediu aprovacao de porta; o aprovador do Docker Desktop ocupou
# a 5433 por um instante, o encaminhamento real falhou ("bind: Only one usage of
# each socket address", com.docker.backend.exe.log) e nunca foi refeito. Container
# saudavel, porta fechada no host, servidor com ECONNREFUSED, zero linha gravada
# no dia. Este watchdog so olhava o :3002, e o launcher pulava pelo lock.
#
# Agora, a cada tick: porta 5433 fechada com o Docker no ar em dois ticks seguidos
# -> `docker restart` (container rodando: refaz o encaminhamento) ou `docker start`
# (container parado). Nunca recria nem remove container ou volume.
# `--ensure-db` e o modo do start-tracker.bat: espera o Docker religar as portas,
# so da start em container parado e conserta a porta na hora.
import json
import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timezone

BASE = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(BASE, "tracker-autostart.log")
STATE_FILE = os.path.join(BASE, ".watchdog-db-state.json")

CONTAINER = "claude-token-tracker-db"
DB_HOST = "127.0.0.1"
DB_PORT = 5433

CLOSED_GRACE_S = 150  # porta fechada ha mais que isso = dois ticks seguidos de 3 min
SETTLE_S = 30  # depois de o container subir, tempo do Docker Desktop religar a porta
PORT_WAIT_S = 60  # espera da porta no --ensure-db, antes e depois do restart
MAX_REPAIRS_PER_HOUR = 3
CREATE_NO_WINDOW = 0x08000000

DOCKER_CANDIDATES = (
    r"C:\Program Files\Docker\Docker\resources\bin\docker.exe",
    r"C:\ProgramData\DockerDesktop\version-bin\docker.exe",
)


def log(msg):
    stamp = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[{stamp}] watchdog: {msg}\n")
    except OSError:
        pass


def docker_exe():
    found = shutil.which("docker")
    if found:
        return found
    for cand in DOCKER_CANDIDATES:
        if os.path.exists(cand):
            return cand
    return None


def run(args, timeout):
    return subprocess.run(
        args,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        creationflags=CREATE_NO_WINDOW,
    )


def port_open(host=DB_HOST, port=DB_PORT, timeout=2.0):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def parse_docker_time(value):
    # "2026-10-10T11:37:14.712153585Z" -> epoch UTC; os nanossegundos ficam de fora
    try:
        dt = datetime.strptime(value[:19], "%Y-%m-%dT%H:%M:%S")
        return dt.replace(tzinfo=timezone.utc).timestamp()
    except (ValueError, OverflowError, OSError):
        return 0.0


def container_state(docker):
    """(rodando, epoch_do_start) ou None com o Docker fora ou o container inexistente."""
    try:
        r = run(
            [docker, "inspect", "-f", "{{.State.Running}}|{{.State.StartedAt}}", CONTAINER],
            timeout=20,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if r.returncode != 0:
        return None
    running, _, started = r.stdout.strip().partition("|")
    return running == "true", parse_docker_time(started)


def load_state():
    try:
        with open(STATE_FILE, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def save_state(state):
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f)
    except OSError:
        pass


def repair(docker, running, reason):
    action = "restart" if running else "start"
    try:
        code = run([docker, action, CONTAINER], timeout=120).returncode
    except (OSError, subprocess.TimeoutExpired) as e:
        code = repr(e)
    log(f"{reason}: docker {action} {CONTAINER} -> exit {code}")
    return action


def guard_db_port(now=None):
    """Um tick. Devolve: open, no-docker, first-seen, waiting, settling, limit, restart ou start."""
    now = time.time() if now is None else now
    state = load_state()
    if port_open():
        if state.get("closed_since"):
            state["closed_since"] = None
            save_state(state)
        return "open"

    docker = docker_exe()
    info = container_state(docker) if docker else None
    if info is None:
        # Docker fora do ar ou container inexistente: so conta porta fechada com o
        # Docker no ar, e nunca recria nada.
        if state.get("closed_since"):
            state["closed_since"] = None
            save_state(state)
        return "no-docker"

    running, started = info
    closed_since = state.get("closed_since")
    if not closed_since:
        state["closed_since"] = now
        save_state(state)
        return "first-seen"
    if now - closed_since < CLOSED_GRACE_S:
        return "waiting"
    if running and now - started < CLOSED_GRACE_S:
        return "settling"  # container acabou de subir; o Docker ainda religa a porta

    repairs = [t for t in state.get("repairs", []) if now - t < 3600]
    if len(repairs) >= MAX_REPAIRS_PER_HOUR:
        state["repairs"] = repairs
        save_state(state)
        log(f"porta {DB_PORT} fechada e {len(repairs)} reparos na ultima hora; nada feito")
        return "limit"

    status = "rodando" if running else "parado"
    action = repair(docker, running, f"porta {DB_PORT} fechada ha {int(now - closed_since)}s, container {status}")
    repairs.append(now)
    save_state({"closed_since": None, "repairs": repairs})
    return action


def wait_port(max_wait_s):
    deadline = time.time() + max_wait_s
    while True:
        if port_open():
            return True
        if time.time() >= deadline:
            return False
        time.sleep(2)


def ensure_db():
    """Modo do start-tracker.bat. Sai 0 com a porta aberta no host, 1 sem ela."""
    docker = docker_exe()
    if not docker:
        log("ensure-db: docker.exe nao encontrado")
        return 1
    info = container_state(docker)
    if info is None:
        log(f"ensure-db: {CONTAINER} nao encontrado ou Docker fora; nada recriado")
        return 1

    running, started = info
    if running:
        wait = SETTLE_S - (time.time() - started)
        if wait > 0:
            log(f"ensure-db: container subiu ha pouco; espera {int(wait)}s o Docker religar a porta")
            time.sleep(wait)
    else:
        # Nao concorre com o restore do proprio Docker: espera e confere de novo.
        time.sleep(SETTLE_S)
        info = container_state(docker)
        if not (info and info[0]):
            repair(docker, False, "ensure-db: container parado")

    if wait_port(PORT_WAIT_S):
        log(f"ensure-db: porta {DB_HOST}:{DB_PORT} aberta")
        return 0
    repair(docker, True, f"ensure-db: porta {DB_PORT} fechada no host")
    if wait_port(PORT_WAIT_S):
        log(f"ensure-db: porta {DB_HOST}:{DB_PORT} aberta depois do restart")
        return 0
    log(f"ensure-db: ERRO porta {DB_PORT} segue fechada; o watchdog tenta de novo a cada tick")
    return 1


def server_up() -> bool:
    try:
        with urllib.request.urlopen("http://localhost:3002/health", timeout=4) as resp:
            return resp.status == 200
    except Exception:
        return False


def main(argv):
    if "--ensure-db" in argv:
        return ensure_db()
    try:
        guard_db_port()
    except Exception as e:  # o guarda do banco nunca impede o do servidor
        log(f"guard_db_port falhou: {e!r}")
    if not server_up():
        vbs = os.path.join(BASE, "start-tracker-silent.vbs")
        subprocess.Popen(["wscript.exe", vbs], creationflags=CREATE_NO_WINDOW, close_fds=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
