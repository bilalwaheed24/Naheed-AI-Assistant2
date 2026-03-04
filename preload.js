const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkPrinters: () => ipcRenderer.invoke('check-printers'),
  checkScanners: () => ipcRenderer.invoke('check-scanners'),
  checkECR: () => ipcRenderer.invoke('check-ecr'),
  checkNetwork: () => ipcRenderer.invoke('check-network'),
  pingHost: (host) => ipcRenderer.invoke('ping-host', host),
  checkServices: () => ipcRenderer.invoke('check-services'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
});
