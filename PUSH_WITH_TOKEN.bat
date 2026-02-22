@echo off
cd /d "%~dp0"
echo ============================================
echo   ATLAS - Push to GitHub (ใช้ Token)
echo ============================================
echo.
if "%GH_TOKEN%"=="" (
  echo กรุณาสร้าง Token ที่: https://github.com/settings/tokens
  echo เลือก scope: repo
  echo.
  set /p GH_TOKEN="วาง Token ที่นี่: "
)
if "%GH_TOKEN%"=="" (
  echo ERROR: ไม่มี Token
  pause
  exit /b 1
)
echo.
echo [1/3] Logging in with token...
echo %GH_TOKEN% | gh auth login --with-token
if errorlevel 1 (
  echo ERROR: Token ไม่ถูกต้อง
  pause
  exit /b 1
)
echo [2/3] Creating repo...
gh repo create atlas-wise-spark --private --source=. --remote=origin --push
if errorlevel 1 (
  echo.
  echo Repo อาจมีอยู่แล้ว - ลอง push อย่างเดียว:
  git push -u origin main
  pause
  exit /b 1
)
echo.
echo ============================================
echo   SUCCESS! Code pushed to GitHub.
echo ============================================
pause
