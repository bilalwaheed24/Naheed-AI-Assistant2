# Naheed IT Assistant — Build & Install Guide

## What This App Does
A lightweight, always-on-top desktop tool for Naheed Supermarket cashier IT support.

### Features
- 🤖 **AI Assistant** — Gemini-powered cashier diagnostics (printers, scanners, ECR, network)
- 🖨️ **Hardware Check** — Detects printers, barcode scanners, POS services
- 📶 **Network Diagnostics** — Internet/DNS status, ping tool, adapter info
- 💳 **ECR/Payment Terminal** — COM port detection, payment process monitoring
- 🖥️ **System Info** — Machine hostname, RAM, CPU, uptime
- 📌 **Always-on-top** — Stays visible while cashier works

---

## Step 1 — Prerequisites (Windows PC)

Install these on your Windows machine:
1. **Node.js** (v18+) → https://nodejs.org
2. **Git** (optional) → https://git-scm.com

---

## Step 2 — Install Dependencies

Open Command Prompt in the project folder:

```cmd
cd naheed-assistant
npm install
```

This installs Electron and the build tools.

---

## Step 3 — Run (Development/Test)

```cmd
npm start
```

The app will open as a small window in the top-right corner.

---

## Step 4 — Build EXE for Distribution

```cmd
npm run build
```

This creates two files in the `dist/` folder:
- `Naheed IT Assistant Setup 1.0.0.exe` — Full installer (run once, installs to all PCs)
- `Naheed IT Assistant 1.0.0.exe` — **Portable** (no install needed, copy & run)

### For cashier PCs without internet:
Use the **portable** version — just copy the `.exe` to a USB drive and run directly.

---

## Step 5 — First-Time Setup (Each Cashier PC)

1. Run the app
2. Click the **gear icon** (bottom of sidebar) → Settings
3. Enter your **Gemini API key** (free from https://aistudio.google.com)
4. Click **Save Key** then **Test Connection**
5. Done — AI assistant is now active!

---

## Creating the Icon

Add `assets/icon.ico` (256x256 .ico file) and `assets/icon.png` before building.
You can convert any PNG to ICO at: https://convertio.co/png-ico/

---

## Project Structure

```
naheed-assistant/
├── main.js          ← Electron main process (hardware checks, IPC)
├── preload.js       ← Secure bridge between UI and Node.js
├── index.html       ← Full UI (AI chat, hardware panels, settings)
├── package.json     ← Build configuration
└── assets/
    └── icon.ico     ← App icon (add before building)
```

---

## Troubleshooting Build Issues

**"electron not found"**
```cmd
npm install --save-dev electron
```

**Build fails on Windows**
```cmd
npm install --global windows-build-tools
```

**Antivirus blocks EXE**
Add an exception for the `dist/` folder in Windows Defender.

---

## Gemini API Key (Free)

1. Go to https://aistudio.google.com
2. Sign in with Google account
3. Click "Get API Key" → "Create API key"
4. Copy the key (starts with `AIza...`)
5. Paste in app Settings

Free tier: 15 requests/minute, 1500/day — more than enough for cashier use.
