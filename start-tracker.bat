@echo off
title Claude Token Tracker
set "BASE=C:\Users\Patrick Neuhaus\Documents\Github\claude-token-tracker"
set "LOGFILE=%BASE%\tracker-autostart.log"
set "PATH=C:\Program Files\nodejs;C:\Program Files\Docker\Docker\resources\bin;C:\ProgramData\DockerDesktop\version-bin;%PATH%"

echo. >> "%LOGFILE%"
echo ========================================== >> "%LOGFILE%"
echo [%date% %time%] Iniciando Token Tracker... >> "%LOGFILE%"

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
        goto end
    )
    timeout /t 5 /nobreak >nul
    goto wait_docker
)

echo [%date% %time%] Docker OK. >> "%LOGFILE%"

REM Sobe PostgreSQL
echo [Token Tracker] Subindo PostgreSQL...
cd /d "%BASE%"
docker compose up -d >> "%LOGFILE%" 2>&1

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
        goto end
    )
    timeout /t 2 /nobreak >nul
    goto wait_pg
)

echo [%date% %time%] PostgreSQL OK. Iniciando servidor Node (detached)... >> "%LOGFILE%"
echo [Token Tracker] Iniciando servidor...

REM Inicia o servidor desacoplado do terminal via VBS - sobrevive ao fechar o terminal
wscript.exe "%BASE%\start-server-detached.vbs"
echo [%date% %time%] Servidor iniciado como processo independente. >> "%LOGFILE%"
echo [Token Tracker] Online! Acesse http://localhost:3001
timeout /t 5 /nobreak >nul
exit /b 0

:end
echo [Token Tracker] ERRO ao iniciar. Veja: %LOGFILE%
timeout /t 10 /nobreak >nul
exit /b 1
