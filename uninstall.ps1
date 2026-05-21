# Uninstall script — remove scheduled tasks e cleanup artifacts.
# Uso: powershell -ExecutionPolicy Bypass -File uninstall.ps1
# Não toca o banco de dados (manter dados históricos). Não desinstala node modules.

$ErrorActionPreference = "Continue"  # continua se algum não existe

$tasks = @(
    "Claude Token Tracker",
    "CodexTokenCollector",
    "ClaudeTokenTrackerLogRotation",
    "ClaudeTokenTrackerBackup"
)

foreach ($t in $tasks) {
    $exists = Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue
    if ($exists) {
        Write-Host "Removendo scheduled task: $t"
        Unregister-ScheduledTask -TaskName $t -Confirm:$false
    } else {
        Write-Host "Task '$t' não existe — skip"
    }
}

# Lock file
$lockFile = Join-Path $env:TEMP "tracker.lock"
if (Test-Path $lockFile) {
    Remove-Item $lockFile -Force
    Write-Host "Lock file removido: $lockFile"
}

# User env var TOKEN_TRACKER_TOKEN — pergunta antes
$tokenVar = [Environment]::GetEnvironmentVariable('TOKEN_TRACKER_TOKEN', 'User')
if ($tokenVar) {
    Write-Host ""
    Write-Host "User env var TOKEN_TRACKER_TOKEN existe (webhook token novo)."
    $resp = Read-Host "Remover também? [s/N]"
    if ($resp -eq 's' -or $resp -eq 'S') {
        [Environment]::SetEnvironmentVariable('TOKEN_TRACKER_TOKEN', $null, 'User')
        Write-Host "Removida."
    } else {
        Write-Host "Mantida."
    }
}

Write-Host ""
Write-Host "Uninstall completo. Banco Postgres (docker) e logs não foram tocados."
Write-Host "Para remover banco: docker compose down -v"
