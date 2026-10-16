@echo off
rem Double-click to run Icon Crate on Windows.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download the LTS version from https://nodejs.org, install it, then double-click this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies, this only happens the first time...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed. See the messages above.
    pause
    exit /b 1
  )
)

echo.
echo Starting Icon Crate. Keep this window open while you use the app; close it to stop.
start "" /min cmd /c "timeout /t 2 >nul & start http://localhost:3000"
call npm start
pause
