@echo off
setlocal EnableDelayedExpansion
title Solco - Avvio piattaforma

echo.
echo  ============================================
echo   SOLCO - Albo Fornitori Digitale
echo  ============================================
echo.

:: Check Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo  ERRORE: Docker non e' in esecuzione.
    echo  Avvia Docker Desktop e riprova.
    echo.
    pause
    exit /b 1
)

:: Detect free ports using PowerShell
echo  Rilevamento porte disponibili...

for /f "delims=" %%p in ('powershell -NoProfile -Command ^
    "$used = (Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue).LocalPort; $p = 5173; while ($used -contains $p) { $p++ }; $p"') do set FRONTEND_PORT=%%p

for /f "delims=" %%p in ('powershell -NoProfile -Command ^
    "$used = (Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue).LocalPort; $p = 8081; while ($used -contains $p) { $p++ }; $p"') do set BACKEND_PORT=%%p

for /f "delims=" %%p in ('powershell -NoProfile -Command ^
    "$used = (Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue).LocalPort; $p = 5433; while ($used -contains $p) { $p++ }; $p"') do set DB_PORT=%%p

echo  Porte assegnate: Frontend=!FRONTEND_PORT! Backend=!BACKEND_PORT! DB=!DB_PORT!
echo.

:: Write .env so docker compose picks up the ports
(
  echo FRONTEND_PORT=!FRONTEND_PORT!
  echo BACKEND_PORT=!BACKEND_PORT!
  echo DB_PORT=!DB_PORT!
) > .env

:: Pull latest images from Docker Hub
echo  Download immagini (solo al primo avvio o aggiornamento)...
docker compose pull
if errorlevel 1 (
    echo  AVVISO: Impossibile scaricare aggiornamenti. Uso immagini locali se disponibili.
)
echo.

:: Start all services
echo  Avvio servizi...
docker compose up -d
if errorlevel 1 (
    echo  ERRORE: Avvio fallito. Controlla i log con: docker compose logs
    pause
    exit /b 1
)

:: Wait for the frontend to respond (up to 2 minutes)
echo  Attesa avvio piattaforma...
set ATTEMPTS=0

:WAIT_LOOP
set /a ATTEMPTS+=1
if !ATTEMPTS! gtr 60 (
    echo.
    echo  ERRORE: La piattaforma non risponde dopo 2 minuti.
    echo  Controlla i log con: docker compose logs
    echo.
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul
powershell -NoProfile -Command ^
    "try { $r = Invoke-WebRequest -Uri 'http://localhost:!FRONTEND_PORT!/' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if errorlevel 1 goto WAIT_LOOP

echo.
echo  ============================================
echo   Piattaforma pronta!
echo.
echo   URL: http://localhost:!FRONTEND_PORT!
echo.
echo   Credenziali amministratore:
echo   superadmin@supplierplatform.com / Admin@1234
echo   responsabile@supplierplatform.com / Admin@1234
echo   revisore@supplierplatform.com    / Admin@1234
echo   viewer@supplierplatform.com      / Admin@1234
echo  ============================================
echo.
echo  Per fermare la piattaforma: docker compose down
echo.

start "" "http://localhost:!FRONTEND_PORT!"

pause
endlocal
