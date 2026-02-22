@echo off
cd /d "%~dp0"
echo ATLAS - Starting...
echo.
echo [1/2] Installing dependencies...
call npm install
if errorlevel 1 (
  echo ERROR: npm install failed.
  pause
  exit /b 1
)
echo.
echo [2/2] Starting dev server (browser will open)...
echo.
call npm run start
pause
