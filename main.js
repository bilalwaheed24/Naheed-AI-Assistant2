const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');

let mainWindow;
let autoPingInterval = null;
let autoPingEnabled = false;
let autoPingHosts = ['8.8.8.8'];

const USER_DATA_PATH = app.getPath('userData');
const HISTORY_FILE = path.join(USER_DATA_PATH, 'chat-history.json');
const SETTINGS_FILE = path.join(USER_DATA_PATH, 'settings.json');

function loadSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch { return {}; }
}
function saveSettings(data) {
  try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2)); } catch {}
}
function loadHistory() {
  try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch { return []; }
}
function saveHistory(data) {
  try { fs.writeFileSync(HISTORY_FILE, JSON.stringify((data || []).slice(-100))); } catch {}
}

function createWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  const s = loadSettings();
  mainWindow = new BrowserWindow({
    width: s.width || 460,
    height: s.height || 720,
    x: s.x !== undefined ? s.x : width - 480,
    y: s.y !== undefined ? s.y : 50,
    resizable: true,
    minWidth: 400,
    minHeight: 500,
    frame: false,
    alwaysOnTop: s.alwaysOnTop !== false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.loadFile('index.html');
  mainWindow.on('moved', () => {
    const [x, y] = mainWindow.getPosition();
    const [w, h] = mainWindow.getSize();
    saveSettings({ ...loadSettings(), x, y, width: w, height: h });
  });
  mainWindow.on('resized', () => {
    const [x, y] = mainWindow.getPosition();
    const [w, h] = mainWindow.getSize();
    saveSettings({ ...loadSettings(), x, y, width: w, height: h });
  });
}

app.whenReady().then(() => {
  createWindow();
  // Load auto-ping config
  const s = loadSettings();
  autoPingEnabled = s.autoPingEnabled || false;
  autoPingHosts = s.autoPingHosts || ['8.8.8.8'];
  startAutoPingLoop();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ── CPU usage ──────────────────────────────────────────────────────────────
function getCpuUsage() {
  return new Promise((resolve) => {
    const c1 = os.cpus();
    setTimeout(() => {
      const c2 = os.cpus();
      let idle = 0, total = 0;
      c2.forEach((cpu, i) => {
        const d1 = c1[i].times, d2 = cpu.times;
        const idleDiff = d2.idle - d1.idle;
        const totalDiff = Object.values(d2).reduce((a,b)=>a+b,0) - Object.values(d1).reduce((a,b)=>a+b,0);
        idle += idleDiff; total += totalDiff;
      });
      resolve(Math.max(0, Math.round(100 - (idle / total) * 100)));
    }, 400);
  });
}

// ── System Stats ───────────────────────────────────────────────────────────
ipcMain.handle('get-system-stats', async () => {
  const cpu = await getCpuUsage();
  const totalMem = os.totalmem(), freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  let disk = { total: '?', used: '?', percent: 0 };
  try {
    disk = await new Promise((res, rej) => {
      const cmd = process.platform === 'win32'
        ? 'wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace /format:csv'
        : "df -k / | tail -1";
      exec(cmd, (err, out) => {
        if (err) return rej(err);
        if (process.platform === 'win32') {
          const parts = out.trim().split('\n').filter(l=>l.trim()&&!l.startsWith('Node'));
          if (parts.length) {
            const c = parts[0].split(',');
            const free = parseInt(c[1])||0, tot = parseInt(c[2])||1;
            res({ total: (tot/1e9).toFixed(0), used: ((tot-free)/1e9).toFixed(0), percent: Math.round((tot-free)/tot*100) });
          } else rej(new Error('no data'));
        } else {
          const p = out.trim().split(/\s+/);
          const tot = parseInt(p[1])*1024, used = parseInt(p[2])*1024;
          res({ total: (tot/1e9).toFixed(0), used: (used/1e9).toFixed(0), percent: parseInt(p[4])||Math.round(used/tot*100) });
        }
      });
    });
  } catch {}
  return {
    cpu,
    ram: { total: (totalMem/1024/1024/1024).toFixed(1), used: (usedMem/1024/1024/1024).toFixed(1), percent: Math.round(usedMem/totalMem*100) },
    disk,
    hostname: os.hostname(), platform: os.platform(), arch: os.arch(),
    uptime: Math.floor(os.uptime()/3600), cpuModel: os.cpus()[0]?.model||'Unknown', cpus: os.cpus().length
  };
});

// ── USB Detection ──────────────────────────────────────────────────────────
ipcMain.handle('get-usb-devices', async () => {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32'
      ? 'wmic path Win32_USBHub get DeviceID,Status /format:csv'
      : 'lsusb 2>/dev/null';
    exec(cmd, (err, stdout) => {
      const devices = [];
      if (!err && stdout) {
        stdout.trim().split('\n').filter(Boolean).forEach(line => {
          if (line.trim() && !line.startsWith('Node') && !line.startsWith('DeviceID')) {
            const l = line.toLowerCase();
            let type = '🔌 USB Device';
            if (l.includes('print')) type = '🖨️ Printer';
            else if (l.includes('scan') || l.includes('hid')) type = '📷 Scanner/HID';
            else if (l.includes('hub')) type = '🔗 USB Hub';
            else if (l.includes('storage') || l.includes('disk')) type = '💾 Storage';
            else if (l.includes('serial') || l.includes('uart') || l.includes('ftdi')) type = '⚡ Serial/ECR';
            devices.push({ name: line.trim().substring(0, 60), type });
          }
        });
      }
      resolve({ devices });
    });
  });
});

// ── Auto Ping Loop ─────────────────────────────────────────────────────────
function startAutoPingLoop() {
  if (autoPingInterval) clearInterval(autoPingInterval);
  autoPingInterval = setInterval(() => {
    if (!autoPingEnabled || !mainWindow) return;
    autoPingHosts.forEach(host => {
      const cmd = process.platform === 'win32' ? `ping -n 1 -w 2000 ${host}` : `ping -c 1 -W 2 ${host}`;
      exec(cmd, (err, stdout) => {
        const ok = !err && (stdout.includes('TTL=') || stdout.includes('ttl=') || stdout.includes('bytes from'));
        const channel = ok ? 'ping-status' : 'ping-alert';
        mainWindow.webContents.send(channel, { host, status: ok ? 'UP' : 'DOWN', time: new Date().toLocaleTimeString() });
      });
    });
  }, 30000);
}

ipcMain.handle('set-auto-ping', (event, { enabled, hosts }) => {
  autoPingEnabled = enabled;
  if (hosts) autoPingHosts = hosts;
  saveSettings({ ...loadSettings(), autoPingEnabled: enabled, autoPingHosts: autoPingHosts });
  startAutoPingLoop();
  return { enabled: autoPingEnabled, hosts: autoPingHosts };
});
ipcMain.handle('get-auto-ping-config', () => {
  return { enabled: autoPingEnabled, hosts: autoPingHosts };
});

// ── Multi-Cashier Ping ─────────────────────────────────────────────────────
ipcMain.handle('ping-cashier', async (event, host) => {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? `ping -n 2 -w 1500 ${host}` : `ping -c 2 -W 1 ${host}`;
    const start = Date.now();
    exec(cmd, (err, stdout) => {
      const ok = !err && (stdout.includes('TTL=') || stdout.includes('ttl=') || stdout.includes('bytes from'));
      const ms = Date.now() - start;
      const avgMatch = stdout.match(/Average = (\d+)ms|avg.*?= [\d.]+\/([\d.]+)/);
      resolve({ host, online: ok, latency: avgMatch ? (avgMatch[1]||avgMatch[2]) : Math.round(ms/2) });
    });
  });
});
ipcMain.handle('get-cashier-list', () => loadSettings().cashiers || []);
ipcMain.handle('save-cashier-list', (event, list) => { saveSettings({ ...loadSettings(), cashiers: list }); return true; });

// ── Hardware Checks ────────────────────────────────────────────────────────
ipcMain.handle('check-printers', async () => {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec('wmic printer get Name,WorkOffline,PrinterStatus /format:csv', (err, stdout) => {
        if (err) return resolve({ printers: [] });
        const lines = stdout.trim().split('\n').filter(l => l.trim() && !l.startsWith('Node'));
        const printers = lines.map(l => { const p=l.split(','); return { name:p[1]||'?', status:p[3]||'?', offline:p[2]==='TRUE' }; }).filter(p=>p.name&&p.name!=='Name');
        resolve({ printers });
      });
    } else {
      exec('lpstat -p 2>/dev/null', (err, stdout) => {
        const printers = !err && stdout ? stdout.trim().split('\n').filter(Boolean).map(l => ({ name: l.split(/\s+/)[1]||l, status:'OK', offline:l.includes('disabled') })) : [];
        resolve({ printers });
      });
    }
  });
});

ipcMain.handle('check-scanners', async () => {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32'
      ? 'wmic path Win32_PnPEntity where "Name like \'%scan%\' or Name like \'%barcode%\'" get Name,Status /format:csv'
      : 'lsusb 2>/dev/null | grep -i "barcode\\|scanner\\|hid\\|honeywell\\|zebra\\|metrologic"';
    exec(cmd, (err, stdout) => {
      const scanners = !err && stdout ? stdout.trim().split('\n').filter(l=>l.trim()&&!l.startsWith('Node')&&l!=='Name').map(l => ({ name:l.trim().substring(0,50), status:'Detected' })) : [];
      resolve({ scanners });
    });
  });
});

ipcMain.handle('check-ecr', async () => {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32'
      ? 'wmic path Win32_SerialPort get Name,Status /format:csv'
      : 'ls /dev/ttyS* /dev/ttyUSB* /dev/ttyACM* 2>/dev/null';
    exec(cmd, (err, stdout) => {
      const ports = !err && stdout ? stdout.trim().split('\n').filter(l=>l.trim()&&!l.startsWith('Node')&&l!=='Name').map(l=>({ name:l.trim(), status:'Present' })) : [];
      resolve({ comPorts: ports, relatedProcesses: [] });
    });
  });
});

ipcMain.handle('check-services', async () => {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec('sc queryex type= all state= all 2>nul', (err, stdout) => {
        const services = [];
        if (stdout) {
          stdout.split('SERVICE_NAME:').slice(1).forEach(block => {
            const nm = block.match(/^\s*(\S+)/), st = block.match(/STATE\s+:\s+\d+\s+(\w+)/);
            if (nm && st) {
              const name = nm[1].trim(), state = st[1].trim();
              if (['print','pos','cash','ecr','sql','retail','spooler'].some(k=>name.toLowerCase().includes(k))) services.push({ name, state });
            }
          });
        }
        resolve({ services });
      });
    } else {
      exec('systemctl list-units --type=service --state=running 2>/dev/null | grep -iE "cups|sane|avahi|bluetooth" | head -8', (err, stdout) => {
        const services = !err && stdout ? stdout.trim().split('\n').filter(Boolean).map(l=>({ name:l.split(/\s+/)[0], state:'RUNNING' })) : [];
        resolve({ services });
      });
    }
  });
});

// ── Network ────────────────────────────────────────────────────────────────
ipcMain.handle('check-network', async () => {
  const results = { interfaces:[], gateway:null, internet:false, dns:false };
  const ifaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(ifaces)) {
    addrs.forEach(a => { if (a.family==='IPv4'&&!a.internal) results.interfaces.push({ name, address:a.address, netmask:a.netmask }); });
  }
  return new Promise((resolve) => {
    exec(process.platform==='win32'?'ping -n 1 -w 1000 8.8.8.8':'ping -c 1 -W 1 8.8.8.8', (err, stdout) => {
      results.internet = !err && (stdout.includes('TTL=')||stdout.includes('ttl=')||stdout.includes('bytes from'));
      exec('nslookup google.com 2>&1', (e2, s2) => {
        results.dns = !e2 && s2.includes('Address');
        const gwcmd = process.platform==='win32' ? 'ipconfig' : "ip route | grep default | awk '{print $3}' | head -1";
        exec(gwcmd, (e3, s3) => {
          if (s3) {
            const m = s3.match(/Default Gateway.*?:\s*([\d.]+)/);
            results.gateway = m ? m[1] : s3.trim().split('\n')[0]||null;
          }
          resolve(results);
        });
      });
    });
  });
});

ipcMain.handle('ping-host', async (event, host) => {
  return new Promise((resolve) => {
    const cmd = process.platform==='win32'?`ping -n 4 -w 1000 ${host}`:`ping -c 4 -W 1 ${host}`;
    const start = Date.now();
    exec(cmd, (err, stdout) => {
      const ok = !err&&(stdout.includes('TTL=')||stdout.includes('ttl=')||stdout.includes('bytes from'));
      const m = stdout.match(/Average = (\d+)ms|avg.*?= [\d.]+\/([\d.]+)/);
      resolve({ host, reachable:ok, avgMs: m?(m[1]||m[2]):((Date.now()-start)/4).toFixed(0) });
    });
  });
});

// ── Persistence ────────────────────────────────────────────────────────────
ipcMain.handle('load-chat-history', () => loadHistory());
ipcMain.handle('save-chat-history', (e, h) => { saveHistory(h); return true; });
ipcMain.handle('clear-chat-history', () => { saveHistory([]); return true; });
ipcMain.handle('get-settings', () => loadSettings());
ipcMain.handle('save-setting', (e, kv) => { saveSettings({ ...loadSettings(), ...kv }); return true; });
ipcMain.handle('get-system-info', () => ({
  hostname: os.hostname(), platform: os.platform(), arch: os.arch(),
  totalMem: (os.totalmem()/1024/1024/1024).toFixed(1), freeMem: (os.freemem()/1024/1024/1024).toFixed(1),
  uptime: Math.floor(os.uptime()/3600), cpus: os.cpus().length, cpuModel: os.cpus()[0]?.model||'Unknown'
}));

// ── Window Controls ────────────────────────────────────────────────────────
ipcMain.handle('minimize-window', () => mainWindow.minimize());
ipcMain.handle('close-window', () => mainWindow.close());
ipcMain.handle('toggle-always-on-top', () => {
  const cur = mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(!cur);
  saveSettings({ ...loadSettings(), alwaysOnTop: !cur });
  return !cur;
});
