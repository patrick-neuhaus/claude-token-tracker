$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument '"C:\Users\Patrick Neuhaus\Documents\Github\claude-token-tracker\start-tracker-silent.vbs"'
$t1 = New-ScheduledTaskTrigger -AtLogOn
$t1.Delay = 'PT30S'
$t2 = New-ScheduledTaskTrigger -AtStartup
$t2.Delay = 'PT60S'
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName 'Claude Token Tracker' -Action $action -Trigger @($t1, $t2) -Settings $settings -Force
Write-Host 'Task registrada com triggers ONLOGON + ONBOOT'
