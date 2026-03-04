@echo off
title Naheed IT Assistant - EXE Builder
color 0A
cls

echo.
echo  =====================================================
echo   Naheed IT Assistant - Auto EXE Builder
echo  =====================================================
echo.

:: Check internet
ping -n 1 google.com >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Internet connection required!
    echo  Please connect to internet and try again.
    pause
    exit
)

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo  [1/4] Node.js not found. Downloading...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile '%TEMP%\node-setup.msi' -UseBasicParsing"
    echo  [1/4] Installing Node.js...
    msiexec /i "%TEMP%\node-setup.msi" /quiet /norestart
    echo  [1/4] Node.js installed! Refreshing PATH...
    call refreshenv >nul 2>&1
    set "PATH=%PATH%;C:\Program Files\nodejs"
) else (
    echo  [1/4] Node.js found OK
)

:: Clone repo
echo.
echo  [2/4] Downloading Naheed IT Assistant source...
if exist "%USERPROFILE%\Desktop\Naheed-Build" (
    rmdir /s /q "%USERPROFILE%\Desktop\Naheed-Build"
)
git clone https://github.com/bilalwaheed24/Naheed-AI-Assistant2.git "%USERPROFILE%\Desktop\Naheed-Build"
if errorlevel 1 (
    echo  [ERROR] Could not download source. Check internet.
    pause
    exit
)

:: Install dependencies
echo.
echo  [3/4] Installing build tools (first time - takes 2-3 mins)...
cd /d "%USERPROFILE%\Desktop\Naheed-Build"
call npm install 2>&1

:: Build EXE
echo.
echo  [4/4] Building portable EXE...
call npm run build-portable 2>&1

:: Copy to Desktop
echo.
if exist "%USERPROFILE%\Desktop\Naheed-Build\dist\*.exe" (
    copy "%USERPROFILE%\Desktop\Naheed-Build\dist\*.exe" "%USERPROFILE%\Desktop\" >nul
    echo  =====================================================
    echo   SUCCESS! EXE is on your Desktop!
    echo  =====================================================
    echo.
    echo  File: Naheed IT Assistant (portable).exe
    echo  Location: Desktop
    echo.
    echo  NEXT STEP:
    echo  1. Double-click the EXE on Desktop
    echo  2. Go to Settings (gear icon)
    echo  3. Enter Gemini API key from aistudio.google.com
    echo.
    start "" "%USERPROFILE%\Desktop"
) else (
    echo  [ERROR] Build failed. See error above.
    echo  Try running as Administrator.
)

pause
