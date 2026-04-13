@echo off
REM Execute este script como Administrador para configurar o auto-start via Task Scheduler

set "PATH=C:\Program Files\nodejs;%PATH%"
set "BASE=%~dp0"
REM Remove trailing backslash
if "%BASE:~-1%"=="\" set "BASE=%BASE:~0,-1%"

echo Compilando TypeScript...
cd /d "%BASE%\server"
call npx tsc
if errorlevel 1 (
    echo ERRO: Falha ao compilar TypeScript!
    pause
    exit /b 1
)
echo Build OK.

echo.
echo Criando tarefa no Task Scheduler...
schtasks /Delete /TN "Claude Token Tracker" /F >nul 2>&1
schtasks /Create /TN "Claude Token Tracker" /TR "wscript.exe \"%BASE%\start-tracker-silent.vbs\"" /SC ONLOGON /DELAY 0000:30 /F

if errorlevel 1 (
    echo.
    echo ERRO: Execute este script como Administrador!
    echo Clique direito no arquivo ^> Executar como administrador
    pause
    exit /b 1
)

echo.
echo Tarefa criada com sucesso!
echo O Token Tracker vai iniciar automaticamente 30s apos o login.
echo.
pause
