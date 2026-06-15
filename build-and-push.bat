@echo off
setlocal
title Solco - Build e Push immagini Docker

set IMAGE_BACKEND=mary1457/solco-backend:latest
set IMAGE_FRONTEND=mary1457/solco-frontend:latest

echo.
echo  Solco - Build e Push su Docker Hub
echo  =====================================
echo  Backend:  %IMAGE_BACKEND%
echo  Frontend: %IMAGE_FRONTEND%
echo.

:: Verify Docker login
docker info >nul 2>&1
if errorlevel 1 (
    echo  ERRORE: Docker non e' in esecuzione.
    pause & exit /b 1
)

echo  Step 1/4 - Build backend...
docker build -t %IMAGE_BACKEND% backend\
if errorlevel 1 (echo  ERRORE: Build backend fallita. & pause & exit /b 1)
echo  Backend OK.
echo.

echo  Step 2/4 - Build frontend...
docker build -t %IMAGE_FRONTEND% frontend\
if errorlevel 1 (echo  ERRORE: Build frontend fallita. & pause & exit /b 1)
echo  Frontend OK.
echo.

echo  Step 3/4 - Push backend su Docker Hub...
docker push %IMAGE_BACKEND%
if errorlevel 1 (echo  ERRORE: Push backend fallito. Sei loggato? Esegui: docker login & pause & exit /b 1)

echo  Step 4/4 - Push frontend su Docker Hub...
docker push %IMAGE_FRONTEND%
if errorlevel 1 (echo  ERRORE: Push frontend fallito. & pause & exit /b 1)

echo.
echo  =====================================
echo   Immagini pubblicate con successo!
echo   https://hub.docker.com/u/mary1457
echo  =====================================
echo.
pause
endlocal
