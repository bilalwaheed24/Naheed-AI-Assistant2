const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Hardware
  checkPrinters: () => ipcRenderer.invoke('check-printers'),
  checkScanners: () => ipcRenderer.invoke('check-scanners'),
  checkECR: () => ipcRenderer.invoke('check-ecr'),
  checkServices: () => ipcRenderer.invoke('check-services'),
  // Network
  checkNetwork: () => ipcRenderer.invoke('check-network'),
  pingHost: (host) => ipcRenderer.invoke('ping-host', host),
  // System
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  // USB
  getUsbDevices: () => ipcRenderer.invoke('get-usb-devices'),
  // Auto ping
  setAutoPing: (cfg) => ipcRenderer.invoke('set-auto-ping', cfg),
  getAutoPingConfig: () => ipcRenderer.invoke('get-auto-ping-config'),
  onPingAlert: (cb) => ipcRenderer.on('ping-alert', (e, data) => cb(data)),
  onPingStatus: (cb) => ipcRenderer.on('ping-status', (e, data) => cb(data)),
  // Multi-cashier
  pingCashier: (host) => ipcRenderer.invoke('ping-cashier', host),
  getCashierList: () => ipcRenderer.invoke('get-cashier-list'),
  saveCashierList: (list) => ipcRenderer.invoke('save-cashier-list', list),
  // Chat history
  loadChatHistory: () => ipcRenderer.invoke('load-chat-history'),
  saveChatHistory: (h) => ipcRenderer.invoke('save-chat-history', h),
  clearChatHistory: () => ipcRenderer.invoke('clear-chat-history'),
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSetting: (kv) => ipcRenderer.invoke('save-setting', kv),
  // Window
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
});
