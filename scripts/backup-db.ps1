# Backup diário Postgres claude_token_tracker.
# Roda via scheduled task ClaudeTokenTrackerBackup daily 03:30.
# Gera .sql.gz em $BackupDir + rotaciona retenção $RetentionDays.
#
# Uso manual: powershell -ExecutionPolicy Bypass -File scripts/backup-db.ps1

param(
    [string]$BackupDir = "$env:USERPROFILE\Documents\backups\claude-token-tracker",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $BackupDir "claude_token_tracker-$timestamp.sql.gz"
$tempSql = Join-Path $env:TEMP "ctt-backup-$timestamp.sql"

try {
    # pg_dump via docker exec. Usamos cmd /c pra que o redirect ">" capture
    # bytes raw — PS 5.1 redirect "> $file" usa UTF-16 LE com BOM e corrompe
    # SQL com chars não-ASCII (acentos em comments, etc).
    $dockerCmd = "docker exec claude-token-tracker-db pg_dump -U tracker -d claude_token_tracker --no-owner --clean --if-exists > `"$tempSql`""
    & cmd /c $dockerCmd
    if ($LASTEXITCODE -ne 0) { throw "pg_dump failed exit $LASTEXITCODE" }

    if (-not (Test-Path $tempSql)) { throw "pg_dump produced no output file" }
    $rawSize = (Get-Item $tempSql).Length
    if ($rawSize -eq 0) { throw "pg_dump produced empty file" }

    # Compress via GZipStream. Stream copy em chunks pra não estourar memória
    # em dumps grandes (50k+ token_entries pode passar de 50MB).
    $input = [System.IO.File]::OpenRead($tempSql)
    try {
        $output = [System.IO.File]::Create($outFile)
        try {
            $gzip = New-Object System.IO.Compression.GZipStream($output, [System.IO.Compression.CompressionLevel]::Optimal)
            try {
                $buffer = New-Object byte[] 81920
                while (($read = $input.Read($buffer, 0, $buffer.Length)) -gt 0) {
                    $gzip.Write($buffer, 0, $read)
                }
            } finally {
                $gzip.Dispose()
            }
        } finally {
            $output.Dispose()
        }
    } finally {
        $input.Dispose()
    }

    Remove-Item $tempSql -Force

    $sizeMB = [math]::Round((Get-Item $outFile).Length / 1MB, 2)
    $rawMB = [math]::Round($rawSize / 1MB, 2)
    Write-Host "[backup] OK $outFile (raw $rawMB MB -> gz $sizeMB MB)"
} catch {
    Write-Error "[backup] FAIL: $_"
    if (Test-Path $tempSql) { Remove-Item $tempSql -Force -ErrorAction SilentlyContinue }
    exit 1
}

# Cleanup retention
$cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "claude_token_tracker-*.sql.gz" |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    ForEach-Object {
        Write-Host "[backup] cleanup $($_.Name)"
        Remove-Item $_.FullName -Force
    }
