@echo off
title Claude Token Tracker
set "BASE=%~dp0"
if "%BASE:~-1%"=="\" set "BASE=%BASE:~0,-1%"
set "LOGFILE=%BASE%\tracker-autostart.log"
set "LOCKFILE=%TEMP%\tracker.lock"
set "PATH=C:\Program Files\nodejs;C:\Program Files\Docker\Docker\resources\bin;C:\ProgramData\DockerDesktop\version-bin;%PATH%"

echo. >> "%LOGFILE%"
echo ========================================== >> "%LOGFILE%"
echo [%date% %time%] Iniciando Token Tracker... >> "%LOGFILE%"

REM Lock check via call subroutine - evita delayed expansion + nested parens
call :check_lock
if errorlevel 1 (
    echo [%date% %time%] Skip spawn por lock ativo. >> "%LOGFILE%"
    goto :eof
)

REM Espera inicial para o Windows carregar servicos de rede e Docker Desktop
echo [Token Tracker] Aguardando 45s para sistema carregar...
echo [%date% %time%] Aguardando 45s inicial >> "%LOGFILE%"
timeout /t 45 /nobreak >nul

REM Aguarda Docker estar disponivel
echo [Token Tracker] Aguardando Docker...
echo [%date% %time%] Aguardando Docker... >> "%LOGFILE%"
set DOCKER_RETRIES=0
:wait_docker
docker ps >nul 2>&1
if errorlevel 1 (
    set /a DOCKER_RETRIES+=1
    if %DOCKER_RETRIES% GEQ 180 (
        echo [%date% %time%] ERRO: Docker nao iniciou apos 15 minutos >> "%LOGFILE%"
        goto end_err
    )
    timeout /t 5 /nobreak >nul
    goto wait_docker
)
echo [%date% %time%] Docker OK. >> "%LOGFILE%"

REM Sobe PostgreSQL
echo [Token Tracker] Subindo PostgreSQL...
cd /d "%BASE%"
docker compose up -d --no-recreate >> "%LOGFILE%" 2>&1

REM Aguarda PostgreSQL aceitar conexoes
echo [Token Tracker] Aguardando PostgreSQL...
echo [%date% %time%] Aguardando PostgreSQL... >> "%LOGFILE%"
set PG_RETRIES=0
:wait_pg
docker exec claude-token-tracker-db pg_isready -U tracker >nul 2>&1
if errorlevel 1 (
    set /a PG_RETRIES+=1
    if %PG_RETRIES% GEQ 30 (
        echo [%date% %time%] ERRO: PostgreSQL nao iniciou >> "%LOGFILE%"
        goto end_err
    )
    timeout /t 2 /nobreak >nul
    goto wait_pg
)
echo [%date% %time%] PostgreSQL OK. Iniciando servidor Node (detached)... >> "%LOGFILE%"
echo [Token Tracker] Iniciando servidor...

REM Inicia o servidor desacoplado via VBS - sobrevive ao fechar o terminal
wscript.exe "%BASE%\start-server-detached.vbs"
echo [%date% %time%] Servidor disparado via VBS. Aguardando healthcheck... >> "%LOGFILE%"

REM Healthcheck via subroutine (evita parens + delayed expansion)
call :healthcheck
if errorlevel 1 goto end_err

REM Captura PID e grava lock file
call :write_lock

echo [Token Tracker] Online! Acesse http://localhost:3002
goto :eof


REM ============================================================
REM Subroutines
REM ============================================================

:check_lock
REM Retorna errorlevel 1 se outro processo node ja roda com lock vivo
if not exist "%LOCKFILE%" exit /b 0
set LOCK_PID=
set /p LOCK_PID=<"%LOCKFILE%"
if "%LOCK_PID%"=="" goto lock_remove
tasklist /FI "PID eq %LOCK_PID%" 2>nul | findstr /i "node.exe" >nul
if not errorlevel 1 (
    echo [%date% %time%] Lock existe e processo %LOCK_PID% vivo. Skip spawn. >> "%LOGFILE%"
    exit /b 1
)
:lock_remove
echo [%date% %time%] Lock stale. Removendo. >> "%LOGFILE%"
del "%LOCKFILE%" 2>nul
exit /b 0

:healthcheck
set HC_TRIES=0
:hc_loop
set /a HC_TRIES+=1
timeout /t 2 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:3002/ > "%TEMP%\tracker_hc.txt" 2>nul
set HC_CODE=
set /p HC_CODE=<"%TEMP%\tracker_hc.txt"
del "%TEMP%\tracker_hc.txt" 2>nul
if "%HC_CODE%"=="200" goto hc_ok
if "%HC_CODE%"=="304" goto hc_ok
if %HC_TRIES% LSS 30 goto hc_loop
echo [%date% %time%] ERRO: servidor nao respondeu apos 60s (last HTTP=%HC_CODE%) >> "%LOGFILE%"
exit /b 1
:hc_ok
echo [%date% %time%] Servidor online em 3002 (HTTP %HC_CODE% apos %HC_TRIES% tries). >> "%LOGFILE%"
exit /b 0

:write_lock
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3002.*LISTENING"') do (
    echo %%a > "%LOCKFILE%"
    echo [%date% %time%] Lock gravado PID=%%a em %LOCKFILE% >> "%LOGFILE%"
    exit /b 0
)
echo [%date% %time%] WARN: nao foi possivel capturar PID pra lock file. >> "%LOGFILE%"
exit /b 0

:end_err
echo [Token Tracker] ERRO ao iniciar. Veja: %LOGFILE%
timeout /t 10 /nobreak >nul
exit /b 1
