@echo off
cd /d "%~dp0"
echo ============================================
echo   ATLAS - Push to GitHub
echo ============================================
echo.
echo [Step 1/2] Logging into GitHub...
echo - A browser will open. Enter the code shown below.
echo - Click "Authorize" to continue.
echo.
call gh auth login -h github.com -p https -w
if errorlevel 1 (
  echo.
  echo ERROR: Login failed or cancelled.
  pause
  exit /b 1
)
echo.
echo [Step 2/2] Creating repo and pushing...
call gh repo create atlas-wise-spark --private --source=. --remote=origin --push
if errorlevel 1 (
  echo.
  echo Note: If repo already exists, run: git remote add origin https://github.com/YOUR_USERNAME/atlas-wise-spark.git
  echo       Then: git push -u origin main
  pause
  exit /b 1
)
echo.
echo ============================================
echo   SUCCESS! Code pushed to GitHub.
echo ============================================
pause
