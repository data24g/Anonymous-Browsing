// electron-anti-detect-browser/src/preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Gửi lệnh từ Renderer sang Main
  openBrowserProfile: (profileOptions) =>
    ipcRenderer.send("open-browser-profile", profileOptions),
  saveProfile: (profile) => ipcRenderer.send("save-profile", profile),
  deleteProfile: (profileId) => ipcRenderer.send("delete-profile", profileId),

  // Yêu cầu dữ liệu từ Main về Renderer
  loadProfiles: () => ipcRenderer.invoke("load-profiles"),

  // Lắng nghe sự kiện từ Main
  onBrowserLaunchedSuccess: (callback) =>
    ipcRenderer.on("browser-launched-success", callback),
  onBrowserLaunchedError: (callback) =>
    ipcRenderer.on("browser-launched-error", callback),
  onProfileSaved: (callback) => ipcRenderer.on("profile-saved", callback),
  onProfileDeleted: (callback) => ipcRenderer.on("profile-deleted", callback),
});
