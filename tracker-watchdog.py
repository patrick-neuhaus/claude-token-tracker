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
import os
import subprocess
import urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))


def server_up() -> bool:
    try:
        with urllib.request.urlopen("http://localhost:3002/health", timeout=4) as resp:
            return resp.status == 200
    except Exception:
        return False


if not server_up():
    vbs = os.path.join(BASE, "start-tracker-silent.vbs")
    CREATE_NO_WINDOW = 0x08000000
    subprocess.Popen(["wscript.exe", vbs], creationflags=CREATE_NO_WINDOW, close_fds=True)
