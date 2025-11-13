@echo off
echo ========================================
echo    Deploiement WPT Villelaure sur Fly.io
echo ========================================
echo.

REM Verification que fly est installe
fly version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Fly CLI n'est pas installe.
    echo.
    echo Installation :
    echo   1. Ouvrir PowerShell en admin
    echo   2. Executer: pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
    echo   3. Fermer et rouvrir le terminal
    echo.
    pause
    exit /b 1
)

echo [OK] Fly CLI est installe
echo.

REM Verifier l'authentification
fly status >nul 2>&1
if errorlevel 1 (
    echo [INFO] Vous devez vous connecter a Fly.io
    echo.
    fly auth login
    echo.
)

echo ========================================
echo    Etape 1: Creation du volume (si necessaire)
echo ========================================
echo.

fly volumes list | findstr "poker_data" >nul 2>&1
if errorlevel 1 (
    echo Creation du volume pour la base de donnees...
    fly volumes create poker_data --region cdg --size 1
    echo.
) else (
    echo [OK] Le volume poker_data existe deja
    echo.
)

echo ========================================
echo    Etape 2: Deploiement de l'application
echo ========================================
echo.

fly deploy

echo.
echo ========================================
echo    Deploiement termine !
echo ========================================
echo.

fly status
echo.

echo Votre application est accessible a :
fly info | findstr "Hostname"
echo.

echo Pour ouvrir dans le navigateur :
echo   fly open
echo.

pause
