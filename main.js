const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    frame: false, // Tắt khung viền mặc định của Windows/Mac
    titleBarStyle: "hidden", // Ẩn thanh tiêu đề hệ thống
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Cho phép dùng require('electron') ở frontend
      devTools: true,
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.png"),
  });

  // Load app từ Vite server (dev) hoặc file tĩnh (prod)
  mainWindow.loadURL("http://localhost:5173");

  // Mở DevTools (có thể comment lại nếu muốn đóng khi build)
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// --- Xử lý sự kiện từ TitleBar Custom ---
ipcMain.on("minimize-window", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("maximize-window", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on("close-window", () => {
  if (mainWindow) mainWindow.close();
});
