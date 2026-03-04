; ╔══════════════════════════════════════════════════════════════╗
; ║   Naheed IT Assistant — Windows Installer                   ║
; ║   Built with NSIS 3.x                                       ║
; ╚══════════════════════════════════════════════════════════════╝

!define APP_NAME "Naheed IT Assistant"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "Naheed Supermarket IT"
!define APP_DIR "NaheedITAssistant"
!define INSTALL_DIR "$PROGRAMFILES64\${APP_DIR}"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_DIR}"

; ── Compressor ──────────────────────────────────────────────────
SetCompressor /SOLID lzma
SetCompressorDictSize 32

; ── General ─────────────────────────────────────────────────────
Name "${APP_NAME} ${APP_VERSION}"
OutFile "Naheed-IT-Assistant-Setup.exe"
InstallDir "${INSTALL_DIR}"
InstallDirRegKey HKLM "Software\${APP_DIR}" "InstallDir"
RequestExecutionLevel admin
ShowInstDetails show
ShowUnInstDetails show

; ── Modern UI ───────────────────────────────────────────────────
!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Header\nsis3-metro.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Wizard\nsis3-metro.bmp"

; Welcome page text
!define MUI_WELCOMEPAGE_TITLE "Welcome to ${APP_NAME}"
!define MUI_WELCOMEPAGE_TEXT "This will install ${APP_NAME} v${APP_VERSION} on your computer.$\r$\n$\r$\nNaheed Supermarket Cashier System Diagnostic Tool.$\r$\n$\r$\nFeatures:$\r$\n• AI-powered cashier diagnostics (Gemini AI)$\r$\n• Hardware detection (printers, scanners, ECR)$\r$\n• Network diagnostics & ping tests$\r$\n• Always-on-top compact window$\r$\n$\r$\nClick Next to continue."

!define MUI_FINISHPAGE_TITLE "Installation Complete!"
!define MUI_FINISHPAGE_TEXT "${APP_NAME} has been installed successfully.$\r$\n$\r$\nOn first launch:$\r$\n1. Click the gear icon (⚙️) in the sidebar$\r$\n2. Enter your Gemini API key$\r$\n3. Click Save & Test$\r$\n$\r$\nGet free API key: aistudio.google.com"
!define MUI_FINISHPAGE_RUN "$INSTDIR\run.bat"
!define MUI_FINISHPAGE_RUN_TEXT "Launch ${APP_NAME} now"
!define MUI_FINISHPAGE_LINK "Get Gemini API key (free)"
!define MUI_FINISHPAGE_LINK_LOCATION "https://aistudio.google.com"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Language
!insertmacro MUI_LANGUAGE "English"

; ── Version Info ────────────────────────────────────────────────
VIProductVersion "1.0.0.0"
VIAddVersionKey /LANG=${LANG_ENGLISH} "ProductName" "${APP_NAME}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "CompanyName" "${APP_PUBLISHER}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "FileDescription" "Naheed Supermarket Cashier IT Tool"
VIAddVersionKey /LANG=${LANG_ENGLISH} "FileVersion" "${APP_VERSION}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "ProductVersion" "${APP_VERSION}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "LegalCopyright" "© 2025 Naheed Supermarket"

; ── Installer Sections ───────────────────────────────────────────
Section "Core Application" SecCore
  SectionIn RO  ; Required section

  SetOutPath "$INSTDIR"
  SetOverwrite on

  DetailPrint "Installing application files..."

  ; Write all embedded app files
  File /oname=main.js "app\main.js"
  File /oname=preload.js "app\preload.js"
  File /oname=index.html "app\index.html"
  File /oname=package.json "app\package.json"

  ; Write the launcher batch file
  FileOpen $0 "$INSTDIR\run.bat" w
  FileWrite $0 "@echo off$\r$\n"
  FileWrite $0 "title Naheed IT Assistant$\r$\n"
  FileWrite $0 "cd /d $\"%~dp0\%$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 ":: Check if Node.js is installed$\r$\n"
  FileWrite $0 "where node >nul 2>&1$\r$\n"
  FileWrite $0 "if errorlevel 1 ($\r$\n"
  FileWrite $0 "    echo Node.js not found. Installing...$\r$\n"
  FileWrite $0 "    call install-node.bat$\r$\n"
  FileWrite $0 ")$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 ":: Check if node_modules exists$\r$\n"
  FileWrite $0 "if not exist node_modules ($\r$\n"
  FileWrite $0 "    echo Installing dependencies (first time only)...$\r$\n"
  FileWrite $0 "    npm install --omit=dev 2>&1$\r$\n"
  FileWrite $0 ")$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 ":: Launch the app$\r$\n"
  FileWrite $0 "start /B npx electron . --no-sandbox$\r$\n"
  FileClose $0

  ; Write node installer helper
  FileOpen $1 "$INSTDIR\install-node.bat" w
  FileWrite $1 "@echo off$\r$\n"
  FileWrite $1 "echo ============================================$\r$\n"
  FileWrite $1 "echo  Naheed IT Assistant - First Time Setup$\r$\n"
  FileWrite $1 "echo ============================================$\r$\n"
  FileWrite $1 "echo.$\r$\n"
  FileWrite $1 "echo Node.js is required. Downloading installer...$\r$\n"
  FileWrite $1 "echo This only happens once.$\r$\n"
  FileWrite $1 "echo.$\r$\n"
  FileWrite $1 "powershell -Command $\"Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile '%TEMP%\node-installer.msi'$\"$\r$\n"
  FileWrite $1 "if exist $\"%TEMP%\node-installer.msi$\" ($\r$\n"
  FileWrite $1 "    msiexec /i $\"%TEMP%\node-installer.msi$\" /quiet /norestart$\r$\n"
  FileWrite $1 "    echo Node.js installed successfully!$\r$\n"
  FileWrite $1 ") else ($\r$\n"
  FileWrite $1 "    echo ERROR: Could not download Node.js.$\r$\n"
  FileWrite $1 "    echo Please install from: https://nodejs.org$\r$\n"
  FileWrite $1 "    pause$\r$\n"
  FileWrite $1 ")$\r$\n"
  FileClose $1

  ; Write a VBScript launcher (no console window popup)
  FileOpen $2 "$INSTDIR\NaheedITAssistant.vbs" w
  FileWrite $2 "Set WshShell = CreateObject($\"WScript.Shell$\")$\r$\n"
  FileWrite $2 "strDir = CreateObject($\"Scripting.FileSystemObject$\").GetParentFolderName(WScript.ScriptFullName)$\r$\n"
  FileWrite $2 "WshShell.CurrentDirectory = strDir$\r$\n"
  FileWrite $2 "WshShell.Run $\"cmd /c run.bat$\", 0, False$\r$\n"
  FileClose $2

  ; Write README
  FileOpen $3 "$INSTDIR\README.txt" w
  FileWrite $3 "NAHEED IT ASSISTANT v1.0.0$\r$\n"
  FileWrite $3 "=============================$\r$\n"
  FileWrite $3 "$\r$\n"
  FileWrite $3 "FIRST TIME SETUP:$\r$\n"
  FileWrite $3 "1. Run NaheedITAssistant.vbs (or double-click shortcut)$\r$\n"
  FileWrite $3 "2. On first launch, Node.js will auto-install if needed$\r$\n"
  FileWrite $3 "3. Click the gear icon in sidebar > Enter Gemini API Key$\r$\n"
  FileWrite $3 "4. Get free key at: https://aistudio.google.com$\r$\n"
  FileWrite $3 "$\r$\n"
  FileWrite $3 "FEATURES:$\r$\n"
  FileWrite $3 "- AI-powered cashier diagnostics$\r$\n"
  FileWrite $3 "- Printer, scanner, ECR detection$\r$\n"
  FileWrite $3 "- Network diagnostics & ping$\r$\n"
  FileWrite $3 "- Always-on-top compact window$\r$\n"
  FileClose $3

  ; Registry entries
  WriteRegStr HKLM "Software\${APP_DIR}" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "${UNINSTALL_KEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "${UNINSTALL_KEY}" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "${UNINSTALL_KEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "${UNINSTALL_KEY}" "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKLM "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\NaheedITAssistant.vbs"
  WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoRepair" 1

  ; Estimate size
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "${UNINSTALL_KEY}" "EstimatedSize" "$0"

  ; Uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  DetailPrint "Creating shortcuts..."

  ; Desktop shortcut
  CreateShortCut "$DESKTOP\${APP_NAME}.lnk" \
    "wscript.exe" \
    "$\"$INSTDIR\NaheedITAssistant.vbs$\"" \
    "" 0 SW_SHOWNORMAL "" "${APP_NAME} - Cashier Diagnostic Tool"

  ; Start Menu
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" \
    "wscript.exe" \
    "$\"$INSTDIR\NaheedITAssistant.vbs$\"" \
    "" 0 SW_SHOWNORMAL "" "${APP_NAME}"
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\Uninstall.lnk" \
    "$INSTDIR\Uninstall.exe"

  DetailPrint "Installation complete!"

SectionEnd

; ── Uninstaller ──────────────────────────────────────────────────
Section "Uninstall"

  ; Remove files
  Delete "$INSTDIR\main.js"
  Delete "$INSTDIR\preload.js"
  Delete "$INSTDIR\index.html"
  Delete "$INSTDIR\package.json"
  Delete "$INSTDIR\package-lock.json"
  Delete "$INSTDIR\run.bat"
  Delete "$INSTDIR\install-node.bat"
  Delete "$INSTDIR\NaheedITAssistant.vbs"
  Delete "$INSTDIR\README.txt"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR\node_modules"
  RMDir "$INSTDIR"

  ; Remove shortcuts
  Delete "$DESKTOP\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\Uninstall.lnk"
  RMDir "$SMPROGRAMS\${APP_NAME}"

  ; Remove registry
  DeleteRegKey HKLM "${UNINSTALL_KEY}"
  DeleteRegKey HKLM "Software\${APP_DIR}"

  DetailPrint "Uninstall complete."

SectionEnd
