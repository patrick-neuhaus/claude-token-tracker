# Log rotation pro claude-token-tracker. Roda via scheduled task daily ou via setup-autostart.
# Rota arquivo > MaxSizeMB pra .1, .2, ... .N. Remove > MaxBackups.

param(
    [string]$LogDir = (Split-Path -Parent $PSScriptRoot),
    [int]$MaxSizeMB = 10,
    [int]$MaxBackups = 5
)

$ErrorActionPreference = "Stop"

$logFiles = @(
    "tracker-server.log",
    "tracker-autostart.log",
    "server.log",
    "server.err.log"
)

foreach ($logName in $logFiles) {
    $logPath = Join-Path $LogDir $logName
    if (-not (Test-Path $logPath)) { continue }

    $sizeMB = (Get-Item $logPath).Length / 1MB
    if ($sizeMB -lt $MaxSizeMB) { continue }

    Write-Host "Rotating $logName ($([math]::Round($sizeMB,2))MB > $MaxSizeMB MB threshold)"

    # Shift .N -> .N+1, descartar oldest
    for ($i = $MaxBackups; $i -gt 0; $i--) {
        $oldRotated = "$logPath.$i"
        $newRotated = "$logPath.$($i+1)"
        if (Test-Path $oldRotated) {
            if ($i -eq $MaxBackups) {
                Remove-Item $oldRotated -Force
            } else {
                Move-Item $oldRotated $newRotated -Force
            }
        }
    }
    Move-Item $logPath "$logPath.1" -Force
    # Cria arquivo vazio pra processos que escrevem em append nao falharem
    New-Item -ItemType File -Path $logPath -Force | Out-Null
}

Write-Host "Log rotation complete."
