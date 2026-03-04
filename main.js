const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { exec, execSync } = require('child_process');
const os = require('os');

let mainWindow;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 420,
    height: 680,
    x: width - 440,
    y: 60,
    resizable: true,
    minWidth: 380,
    minHeight: 500,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── Hardware Checks ──────────────────────────────────────────────────────────

ipcMain.handle('check-printers', async () => {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec('wmic printer get Name,WorkOffline,PrinterStatus /format:csv', (err, stdout) => {
        if (err) return resolve({ error: err.message, printers: [] });
        const lines = stdout.trim().split('\n').filter(l => l.trim() && !l.startsWith('Node'));
        const printers = lines.map(line => {
          const parts = line.split(',');
          return {
            name: parts[1] || 'Unknown',
            status: parts[3] || 'Unknown',
            offline: parts[2] === 'TRUE'
          };
        }).filter(p => p.name && p.name !== 'Name');
        resolve({ printers });
      });
    } else {
      exec('lpstat -p 2>/dev/null || echo "no-cups"', (err, stdout) => {
        resolve({ printers: [{ name: 'Linux/lpstat', status: stdout.trim() }] });
      });
    }
  });
});

ipcMain.handle('check-scanners', async () => {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec('wmic path Win32_PnPEntity where "Name like \'%scan%\' or Name like \'%scanner%\' or Name like \'%barcode%\' or Name like \'%honeywell%\' or Name like \'%zebra%\' or Name like \'%datalogic%\'" get Name,Status /format:csv', (err, stdout) => {
        if (err) return resolve({ scanners: [], error: err.message });
        const lines = stdout.trim().split('\n').filter(l => l.trim() && !l.startsWith('Node'));
        const scanners = lines.map(line => {
          const parts = line.split(',');
          return { name: parts[1] || 'Unknown', status: parts[2] || 'Unknown' };
        }).filter(s => s.name && s.name !== 'Name');
        resolve({ scanners });
      });
    } else {
      resolve({ scanners: [] });
    }
  });
});

ipcMain.handle('check-ecr', async () => {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      // Check for ECR/POS terminal devices via COM ports and USB
      exec('wmic path Win32_SerialPort get Name,Status /format:csv', (err, stdout) => {
        const ports = [];
        if (!err) {
          const lines = stdout.trim().split('\n').filter(l => l.trim() && !l.startsWith('Node'));
          lines.forEach(line => {
            const parts = line.split(',');
            if (parts[1] && parts[1] !== 'Name') {
              ports.push({ name: parts[1], status: parts[2] || 'OK' });
            }
          });
        }
        // Also check for payment terminal processes
        exec('tasklist /FI "IMAGENAME eq payment*" /FO CSV 2>nul & tasklist /FI "IMAGENAME eq pos*" /FO CSV 2>nul & tasklist /FI "IMAGENAME eq ecr*" /FO CSV 2>nul', (err2, stdout2) => {
          const processes = stdout2 ? stdout2.split('\n').filter(l => l.includes('.exe')).map(l => l.split(',')[0].replace(/"/g, '')) : [];
          resolve({ comPorts: ports, relatedProcesses: processes });
        });
      });
    } else {
      resolve({ comPorts: [], relatedProcesses: [] });
    }
  });
});

// ─── Network Checks ───────────────────────────────────────────────────────────

ipcMain.handle('check-network', async () => {
  return new Promise((resolve) => {
    const results = { interfaces: [], gateway: null, internet: false, dns: false };

    // Get network interfaces
    const ifaces = os.networkInterfaces();
    for (const [name, addrs] of Object.entries(ifaces)) {
      addrs.forEach(addr => {
        if (addr.family === 'IPv4' && !addr.internal) {
          results.interfaces.push({ name, address: addr.address, netmask: addr.netmask });
        }
      });
    }

    // Ping gateway
    const pingCmd = process.platform === 'win32' ? 'ping -n 1 -w 1000 8.8.8.8' : 'ping -c 1 -W 1 8.8.8.8';
    exec(pingCmd, (err, stdout) => {
      results.internet = !err && (stdout.includes('TTL=') || stdout.includes('ttl=') || stdout.includes('bytes from'));

      // DNS check
      exec('nslookup google.com 2>&1', (err2, stdout2) => {
        results.dns = !err2 && stdout2.includes('Address');

        // Get default gateway
        if (process.platform === 'win32') {
          exec('ipconfig', (err3, stdout3) => {
            const match = stdout3 && stdout3.match(/Default Gateway.*?:\s*([\d.]+)/);
            if (match) results.gateway = match[1];
            resolve(results);
          });
        } else {
          resolve(results);
        }
      });
    });
  });
});

ipcMain.handle('ping-host', async (event, host) => {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32'
      ? `ping -n 4 -w 1000 ${host}`
      : `ping -c 4 -W 1 ${host}`;
    const start = Date.now();
    exec(cmd, (err, stdout) => {
      const duration = Date.now() - start;
      const success = !err && (stdout.includes('TTL=') || stdout.includes('ttl=') || stdout.includes('bytes from'));
      const avgMatch = stdout.match(/Average = (\d+)ms|avg.*?= [\d.]+\/([\d.]+)/);
      resolve({
        host,
        reachable: success,
        avgMs: avgMatch ? (avgMatch[1] || avgMatch[2]) : (duration / 4).toFixed(0),
        output: stdout.substring(0, 300)
      });
    });
  });
});

// ─── Services/Processes Check ─────────────────────────────────────────────────

ipcMain.handle('check-services', async () => {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      const posServices = ['Spooler', 'RemoteRegistry', 'MSSQLSERVER', 'SQLEXPRESS', 'RetailPOS', 'POSService'];
      exec('sc queryex type= all state= all 2>nul', (err, stdout) => {
        const services = [];
        if (stdout) {
          const blocks = stdout.split('SERVICE_NAME:').slice(1);
          blocks.forEach(block => {
            const nameMatch = block.match(/^\s*(\S+)/);
            const stateMatch = block.match(/STATE\s+:\s+\d+\s+(\w+)/);
            if (nameMatch && stateMatch) {
              const name = nameMatch[1].trim();
              const state = stateMatch[1].trim();
              if (posServices.some(s => name.toLowerCase().includes(s.toLowerCase())) ||
                  name.toLowerCase().includes('print') ||
                  name.toLowerCase().includes('pos') ||
                  name.toLowerCase().includes('cash')) {
                services.push({ name, state });
              }
            }
          });
        }
        resolve({ services });
      });
    } else {
      resolve({ services: [] });
    }
  });
});

// ─── Window Controls ──────────────────────────────────────────────────────────

ipcMain.handle('minimize-window', () => mainWindow.minimize());
ipcMain.handle('close-window', () => mainWindow.close());
ipcMain.handle('toggle-always-on-top', () => {
  const current = mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(!current);
  return !current;
});

ipcMain.handle('get-system-info', () => {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    totalMem: (os.totalmem() / 1024 / 1024 / 1024).toFixed(1),
    freeMem: (os.freemem() / 1024 / 1024 / 1024).toFixed(1),
    uptime: Math.floor(os.uptime() / 3600),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Unknown'
  };
});
