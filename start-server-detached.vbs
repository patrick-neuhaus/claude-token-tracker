Dim WshShell
Set WshShell = CreateObject("WScript.Shell")

' Resolve o diretório base a partir da localização deste script
Dim basePath
basePath = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\") - 1)

' Roda o servidor Node completamente detachado - sem janela, sem terminal
' O processo filho sobrevive mesmo se o pai morrer
WshShell.Run "cmd /c node """ & basePath & "\server\dist\index.js"" >> """ & basePath & "\tracker-server.log"" 2>&1", 0, False

Set WshShell = Nothing
