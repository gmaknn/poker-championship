# Sauvegarde COMPLETE de la prod Fly.io (base SQLite + avatars) dans backups\<horodatage>\
#
#   npm run backup:prod
#   (ou) powershell -ExecutionPolicy Bypass -File scripts\backup-prod.ps1
#
# Lecture seule côté prod : snapshot cohérent via VACUUM INTO (l'app peut rester en ligne),
# vérification d'intégrité, téléchargement, nettoyage des fichiers temporaires distants.
# Conserve les 30 dernières sauvegardes locales.

param(
  [string]$App = "wpt-villelaure",
  [int]$Keep = 30
)

# "Continue" : en PS 5.1, "Stop" transforme le stderr de fly en erreur fatale ; les échecs sont testés via $LASTEXITCODE
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dir = Join-Path $root "backups\$stamp"

function Invoke-Remote([string]$Command) {
  $out = fly ssh console -a $App -C $Command 2>&1
  $out | Where-Object { $_ -notmatch '^Connecting to' } | ForEach-Object { Write-Host "  $_" }
  if ($LASTEXITCODE -ne 0) { throw "Commande distante en échec : $Command" }
  return $out
}

Write-Host "== Sauvegarde de $App -> $dir" -ForegroundColor Cyan
New-Item -ItemType Directory -Force $dir | Out-Null

# 1. Snapshot + intégrité + archive avatars, sur la machine
$js = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot "prod-backup\remote-snapshot.js")
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($js))
$out = Invoke-Remote "sh -c 'echo $b64 | base64 -d > /app/_remote-snapshot.js && cd /app && node _remote-snapshot.js; rc=`$?; rm -f /app/_remote-snapshot.js; exit `$rc'"
$statsLine = $out | Where-Object { $_ -match '^BACKUP_STATS ' } | Select-Object -First 1
if (-not $statsLine) { throw "Snapshot distant non confirmé" }
$stats = ($statsLine -replace '^BACKUP_STATS ', '') | ConvertFrom-Json

try {
  # 2. Téléchargement
  fly ssh sftp get -a $App /data/_backup-snapshot.db (Join-Path $dir "dev.db")
  if ($LASTEXITCODE -ne 0) { throw "Téléchargement de la base en échec" }
  fly ssh sftp get -a $App /data/_backup-avatars.tgz (Join-Path $dir "avatars.tgz")
  if ($LASTEXITCODE -ne 0) { throw "Téléchargement des avatars en échec" }
}
finally {
  # 3. Nettoyage distant (toujours)
  fly ssh console -a $App -C "rm -f /data/_backup-snapshot.db /data/_backup-avatars.tgz" 2>&1 | Out-Null
}

# 4. Vérification locale des tailles
$dbSize = (Get-Item (Join-Path $dir "dev.db")).Length
$avSize = (Get-Item (Join-Path $dir "avatars.tgz")).Length
if ($dbSize -ne $stats.dbBytes) { throw "Taille de la base incohérente ($dbSize octets reçus, $($stats.dbBytes) attendus)" }
if ($avSize -ne $stats.avatarsBytes) { throw "Taille des avatars incohérente ($avSize reçus, $($stats.avatarsBytes) attendus)" }

$manifest = [ordered]@{
  app = $App
  createdAt = (Get-Date).ToString("o")
  gitCommit = (git -C $root rev-parse --short HEAD 2>$null)
  stats = $stats
}
$manifest | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 (Join-Path $dir "manifest.json")

# 5. Rotation
Get-ChildItem (Join-Path $root "backups") -Directory | Sort-Object Name -Descending | Select-Object -Skip $Keep | Remove-Item -Recurse -Force

Write-Host ""
Write-Host "Sauvegarde OK : $dir" -ForegroundColor Green
Write-Host ("  base    : {0:N0} octets, intégrité ok - {1} joueurs, {2} tournois, {3} éliminations, {4} busts" -f $dbSize, $stats.players, $stats.tournaments, $stats.eliminations, $stats.bustEvents)
Write-Host ("  avatars : {0:N0} octets" -f $avSize)
Write-Host "Restauration : npm run restore:prod -- -Backup backups\$stamp [-WithAvatars]"
