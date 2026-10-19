@echo off
rem BOM Studio launcher (Windows). Requires Node.js 20 or newer.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20+ is required: https://nodejs.org/
  pause
  exit /b 1
)

rem Optional: DigiKey credentials for the server (they can also be entered in Settings)
rem set DIGIKEY_CLIENT_ID=...
rem set DIGIKEY_CLIENT_SECRET=...
if exist bom-studio.env.cmd call bom-studio.env.cmd

if "%PORT%"=="" set PORT=3000
set HOSTNAME=127.0.0.1

echo Starting BOM Studio on http://localhost:%PORT% (close this window to stop)
start "" "http://localhost:%PORT%"
node server.js
