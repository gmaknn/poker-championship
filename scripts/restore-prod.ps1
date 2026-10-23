# Restauration de la prod Fly.io depuis une sauvegarde de scripts\backup-prod.ps1
#
#   npm run restore:prod -- -Backup backups\20261023-180000
#   npm run restore:prod -- -Backup backups\20261023-180000 -WithAvatars
#
# Étapes : confirmation -> sauvegarde de sécurité de l'état actuel -> upload -> vérification
# d'intégrité sur la machine -> remplacement (ancienne base conservée sur /data) -> redémarrage
# -> contrôle de santé. Les migrations manquantes sont rejouées au démarrage (prisma migrate deploy).
#
# ATTENTION : tout ce qui a été saisi depuis la sauvegarde est perdu (sauf dans la sauvegarde de sécurité).
# Ne pas lancer pendant un tournoi en cours.

param(
  [Parameter(Mandatory = $true)][string]$Backup,
  [switch]$WithAvatars,
  [string]$App = "wpt-villelaure"
)

# "Continue" : en PS 5.1, "Stop" transforme le stderr de fly en erreur fatale ; les échecs sont testés via $LASTEXITCODE
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
if (-not [IO.Path]::IsPathRooted($Backup)) { $Backup = Join-Path $root $Backup }
$db = Join-Path $Backup "dev.db"
$avatars = Join-Path $Backup "avatars.tgz"
if (-not (Test-Path $db)) { throw "Base introuvable : $db" }
if ($WithAvatars -and -not (Test-Path $avatars)) { throw "Archive avatars introuvable : $avatars" }

$manifestPath = Join-Path $Backup "manifest.json"
Write-Host "== RESTAURATION de $App depuis $Backup" -ForegroundColor Yellow
if (Test-Path $manifestPath) {
  $m = Get-Content -Raw $manifestPath | ConvertFrom-Json
  Write-Host "  Sauvegarde du $($m.createdAt) : $($m.stats.players) joueurs, $($m.stats.tournaments) tournois"
}
Write-Host "  Avatars : $(if ($WithAvatars) { 'restaurés' } else { 'inchangés' })"
Write-Host "  Tout ce qui a été saisi en prod depuis cette sauvegarde sera remplacé." -ForegroundColor Yellow
$confirm = Read-Host "Tapez RESTAURER pour continuer"
if ($confirm -ne "RESTAURER") { Write-Host "Annulé."; exit 1 }

# 1. Sauvegarde de sécurité de l'état actuel
Write-Host "`n== 1/4 Sauvegarde de sécurité de l'état actuel" -ForegroundColor Cyan
& (Join-Path $PSScriptRoot "backup-prod.ps1") -App $App
if (-not $?) { throw "Sauvegarde de sécurité en échec : restauration annulée" }

# 2. Upload
Write-Host "`n== 2/4 Envoi des fichiers" -ForegroundColor Cyan
fly ssh console -a $App -C "rm -f /data/_restore-upload.db /data/_restore-avatars.tgz" 2>&1 | Out-Null
fly ssh sftp put -a $App $db /data/_restore-upload.db
if ($LASTEXITCODE -ne 0) { throw "Envoi de la base en échec" }
if ($WithAvatars) {
  fly ssh sftp put -a $App $avatars /data/_restore-avatars.tgz
  if ($LASTEXITCODE -ne 0) { throw "Envoi des avatars en échec" }
}

# 3. Vérification + remplacement sur la machine
Write-Host "`n== 3/4 Vérification et remplacement" -ForegroundColor Cyan
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$js = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot "prod-backup\remote-restore.js")
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($js))
$flag = if ($WithAvatars) { "avec-avatars" } else { "" }
$out = fly ssh console -a $App -C "sh -c 'echo $b64 | base64 -d > /app/_remote-restore.js && cd /app && node _remote-restore.js $stamp $flag; rc=`$?; rm -f /app/_remote-restore.js; exit `$rc'" 2>&1
$out | Where-Object { $_ -notmatch '^Connecting to' } | ForEach-Object { Write-Host "  $_" }
if (-not ($out -match 'RESTORE_OK')) { throw "Remplacement non confirmé : la prod n'a pas été redémarrée. Vérifier /data." }

# 4. Redémarrage + santé
Write-Host "`n== 4/4 Redémarrage" -ForegroundColor Cyan
fly apps restart $App
$healthy = $false
for ($i = 0; $i -lt 30 -and -not $healthy; $i++) {
  Start-Sleep -Seconds 5
  try { $healthy = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 "https://$App.fly.dev/api/health").StatusCode -eq 200 } catch { }
}
if (-not $healthy) { throw "L'app ne répond pas après redémarrage : vérifier 'fly logs -a $App'" }

Write-Host "`nRestauration terminée, app en ligne." -ForegroundColor Green
Write-Host "Ancienne base conservée sur la machine : /data/dev.db.before-restore-$stamp"
