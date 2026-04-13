Dim basePath
basePath = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\") - 1)

Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """" & basePath & "\start-tracker.bat""", 7, False
