const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Profile related functions
  getProfiles: () => ipcRenderer.invoke("get-profiles"),
  createProfile: (profileData) => ipcRenderer.invoke("create-profile", profileData),
  deleteProfile: (profileName) => ipcRenderer.invoke("delete-profile", profileName),
  getProfileConfig: (profileName) => ipcRenderer.invoke("get-profile-config", profileName),
  updateProfileConfig: (profileName, config) => ipcRenderer.invoke("update-profile-config", profileName, config),
  openBrowser: (profileName, url) => ipcRenderer.invoke("open-browser", profileName, url),
  
  // FIX: Thêm hàm quản lý browser
  closeBrowser: (profileName) => ipcRenderer.invoke("close-browser", profileName),
  getActiveBrowsers: () => ipcRenderer.invoke("get-active-browsers"),

  // Proxy related functions
  getProxies: () => ipcRenderer.invoke("get-proxies"),
  addProxy: (proxyConfig) => ipcRenderer.invoke("add-proxy", proxyConfig),
  updateProxy: (oldName, newConfig) => ipcRenderer.invoke("update-proxy", oldName, newConfig),
  deleteProxy: (proxyName) => ipcRenderer.invoke("delete-proxy", proxyName),
});