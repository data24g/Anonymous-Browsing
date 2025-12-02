const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Profile related functions
  getProfiles: () => ipcRenderer.invoke("get-profiles"),
  createProfile: (profileData) => ipcRenderer.invoke("create-profile", profileData),
  deleteProfile: (profileName) => ipcRenderer.invoke("delete-profile", profileName),
  getProfileConfig: (profileName) => ipcRenderer.invoke("get-profile-config", profileName),
  openBrowser: (profileName, url) => ipcRenderer.invoke("open-browser", profileName, url),
  
  // Hardware options
  getHardwareOptions: () => ipcRenderer.invoke("get-hardware-options"),
  
  // Browser management
  closeBrowser: (profileName) => ipcRenderer.invoke("close-browser", profileName),
  
  // Proxy related functions
  getProxies: () => ipcRenderer.invoke("get-proxies"),
  addProxy: (proxyConfig) => ipcRenderer.invoke("add-proxy", proxyConfig),
  updateProxy: (oldName, newConfig) => ipcRenderer.invoke("update-proxy", oldName, newConfig),
  deleteProxy: (proxyName) => ipcRenderer.invoke("delete-proxy", proxyName),
  
  // Proxy utilities
  parseProxyString: (proxyString) => ipcRenderer.invoke("parse-proxy-string", proxyString),
  testProxy: (proxyConfig) => ipcRenderer.invoke("test-proxy", proxyConfig),
});