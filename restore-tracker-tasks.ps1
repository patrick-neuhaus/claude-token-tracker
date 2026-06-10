# restore-tracker-tasks.ps1
# Re-registra scheduled tasks do claude-token-tracker SEM admin
# (principal Interactive/Limited, padrao do register-codex-token-collector-task.ps1).
# try/catch por task: uma falha nao aborta as outras.
# ONBOOT (pre-login) NAO incluido (precisa admin). Pra ONBOOT: setup-autostart-v2.ps1 como Admin.
# CodexTokenCollector re-registrado a parte (skillforge/codex/scripts/register-codex-token-collector-task.ps1).

$base = "C:\Users\Patrick Neuhaus\Documents\Github\claude-token-tracker"
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

function Reg($name, $action, $trigger) {
  try {
    Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force -ErrorAction Stop | Out-Null
    Write-Host "OK: $name"
  } catch {
    Write-Host "FAIL: $name -> $($_.Exception.Message)"
  }
}

# Autostart via WATCHDOG time-based + pythonw (WINDOWLESS, zero janela).
# powershell.exe piscava janela a cada tick -> trocado por pythonw (subsistema GUI,
# igual o codex collector). A cada 3min: se :3002 caiu, sobe. Cobre reboot E crash.
$pythonw = (Get-Command pythonw -ErrorAction SilentlyContinue).Source
if (-not $pythonw) { $pythonw = 'C:\Python313\pythonw.exe' }
Reg 'ClaudeTokenTrackerWatchdog' `
  (New-ScheduledTaskAction -Execute $pythonw -Argument "`"$base\tracker-watchdog.py`"") `
  (New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(1)) -RepetitionInterval (New-TimeSpan -Minutes 3) -RepetitionDuration ([TimeSpan]::FromDays(3650)))

Reg 'ClaudeTokenTrackerBackup' `
  (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$base\scripts\backup-db.ps1`"") `
  (New-ScheduledTaskTrigger -Daily -At ([datetime]::Today.AddHours(3).AddMinutes(30)))

Reg 'ClaudeTokenTrackerLogRotation' `
  (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$base\scripts\rotate-logs.ps1`"") `
  (New-ScheduledTaskTrigger -Daily -At ([datetime]::Today.AddHours(3)))

Write-Host "Done."
