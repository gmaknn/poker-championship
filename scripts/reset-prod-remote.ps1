<#
.SYNOPSIS
    Execute production reset remotely via Fly.io SSH.

.DESCRIPTION
    This wrapper script runs reset-prod.js on the Fly.io machine via SSH,
    where PROD_RESET_TOKEN_EXPECTED secret is available.

.PARAMETER Token
    The PROD_RESET_TOKEN to pass to the remote reset script.
    Can also be set via PROD_RESET_TOKEN environment variable.

.EXAMPLE
    .\scripts\reset-prod-remote.ps1 -Token "my-secret-token"

.EXAMPLE
    $env:PROD_RESET_TOKEN = "my-secret-token"
    npm run reset:prod
#>

param(
    [Parameter()]
    [string]$Token = $env:PROD_RESET_TOKEN
)

$ErrorActionPreference = "Stop"

# App name (configurable via env)
$AppName = if ($env:FLY_APP_NAME) { $env:FLY_APP_NAME } else { "wpt-villelaure" }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  REMOTE PROD RESET via Fly.io SSH" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Target app: $AppName"
Write-Host ""

# Check 1: flyctl installed
Write-Host "Checking flyctl..." -NoNewline
try {
    $flyVersion = flyctl version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "flyctl not found"
    }
    Write-Host " OK" -ForegroundColor Green
    Write-Host "  $flyVersion"
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "[ERROR] flyctl is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Install: https://fly.io/docs/flyctl/install/" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Check 2: flyctl authenticated
Write-Host "Checking Fly.io authentication..." -NoNewline
try {
    $authCheck = flyctl auth whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Not authenticated"
    }
    Write-Host " OK" -ForegroundColor Green
    Write-Host "  Logged in as: $authCheck"
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "[ERROR] Not authenticated with Fly.io" -ForegroundColor Red
    Write-Host "Run: flyctl auth login" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Check 3: Token provided
Write-Host "Checking PROD_RESET_TOKEN..." -NoNewline
if (-not $Token) {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "[ERROR] PROD_RESET_TOKEN is required" -ForegroundColor Red
    Write-Host "Provide via:" -ForegroundColor Yellow
    Write-Host "  `$env:PROD_RESET_TOKEN = 'your-token'" -ForegroundColor Yellow
    Write-Host "  npm run reset:prod" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host " OK" -ForegroundColor Green

Write-Host ""
Write-Host "Connecting to $AppName via SSH..." -ForegroundColor Yellow
Write-Host ""

# Execute reset-prod.js on the remote machine
$remoteCmd = "cd /app && ALLOW_PROD_RESET=YES PROD_RESET_TOKEN=$Token node reset-prod.js"

try {
    flyctl ssh console --app $AppName -C $remoteCmd
    $exitCode = $LASTEXITCODE
} catch {
    Write-Host ""
    Write-Host "[ERROR] SSH execution failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  REMOTE RESET COMPLETED SUCCESSFULLY" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  REMOTE RESET FAILED (exit code: $exitCode)" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}

exit $exitCode
