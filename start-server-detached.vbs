Dim WshShell
Set WshShell = CreateObject("WScript.Shell")

' Roda o servidor Node completamente detachado - sem janela, sem terminal
' O processo filho sobrevive mesmo se o pai morrer
WshShell.Run "cmd /c node ""C:\Users\Patrick Neuhaus\Documents\Github\claude-token-tracker\server\dist\index.js"" >> ""C:\Users\Patrick Neuhaus\Documents\Github\claude-token-tracker\tracker-server.log"" 2>&1", 0, False

Set WshShell = Nothing
