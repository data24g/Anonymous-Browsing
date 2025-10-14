// electron-anti-detect-browser/main.js
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { chromium, firefox, webkit } = require("playwright"); // Import Playwright's browser launchers

// Đường dẫn đến file profiles.json
const PROFILES_DIR = path.join(app.getPath("userData"), "profiles");
const PROFILES_FILE = path.join(PROFILES_DIR, "profiles.json"); // Đặt profiles.json vào thư mục profiles

let profiles = [];

// Hàm đọc profiles từ file
function loadProfilesFromFile() {
  try {
    if (!fs.existsSync(PROFILES_DIR)) {
      fs.mkdirSync(PROFILES_DIR, { recursive: true });
    }
    if (fs.existsSync(PROFILES_FILE)) {
      const data = fs.readFileSync(PROFILES_FILE, "utf8");
      profiles = JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load profiles:", error);
    profiles = [];
  }
}

// Hàm lưu profiles vào file
function saveProfilesToFile() {
  try {
    if (!fs.existsSync(PROFILES_DIR)) {
      fs.mkdirSync(PROFILES_DIR, { recursive: true });
    }
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save profiles:", error);
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false, // Quan trọng: Tắt nodeIntegration trong renderer
      contextIsolation: true, // Quan trọng: Bật contextIsolation
    },
  });

  // Load the index.html of the app.
  mainWindow.loadFile("index.html");

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  loadProfilesFromFile(); // Tải profiles khi ứng dụng sẵn sàng
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// === IPC Handlers ===

// Xử lý yêu cầu lưu profile
ipcMain.on("save-profile", (event, profile) => {
  const existingIndex = profiles.findIndex((p) => p.id === profile.id);
  if (existingIndex > -1) {
    profiles[existingIndex] = profile;
  } else {
    profiles.push(profile);
  }
  saveProfilesToFile();
  event.reply("profile-saved", {
    success: true,
    message: "Profile saved successfully!",
  });
});

// Xử lý yêu cầu tải profiles
ipcMain.handle("load-profiles", async () => {
  return profiles;
});

// Xử lý yêu cầu xóa profile
ipcMain.on("delete-profile", (event, profileId) => {
  profiles = profiles.filter((p) => p.id !== profileId);
  saveProfilesToFile();
  event.reply("profile-deleted", {
    success: true,
    message: "Profile deleted successfully!",
  });
});

// Xử lý yêu cầu mở trình duyệt Playwright
ipcMain.on("open-browser-profile", async (event, profileOptions) => {
  let browserInstance;
  let browserTypeLauncher; // chromium, firefox, webkit

  switch (profileOptions.browserType) {
    case "Google Chrome":
    case "Microsoft Edge":
      browserTypeLauncher = chromium;
      break;
    case "Opera": // Opera cũng dựa trên Chromium
      browserTypeLauncher = chromium;
      break;
    case "Firefox":
      browserTypeLauncher = firefox;
      break;
    case "WebKit":
      browserTypeLauncher = webkit;
      break;
    case "Chromium": // Default
    default:
      browserTypeLauncher = chromium;
      break;
  }

  try {
    console.log(
      `Launching ${profileOptions.browserType || "Chromium"} with profile:`,
      profileOptions.name
    );

    let proxyConfig = {};
    let launchArgs = [
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars", // THÊM DÒNG NÀY VÀO ĐÂY
    ];

    // --- Cấu hình Proxy ---
    if (profileOptions.proxy) {
      const parts = profileOptions.proxy.split(":");
      if (parts.length === 4) {
        // IP:PORT:USERNAME:PASSWORD
        const ip = parts[0];
        const port = parts[1];
        const username = parts[2];
        const password = parts[3];
        proxyConfig = {
          server: `http://${ip}:${port}`,
          username: username,
          password: password,
        };
      } else if (parts.length === 2) {
        // IP:PORT (không xác thực)
        const ip = parts[0];
        const port = parts[1];
        proxyConfig = {
          server: `http://${ip}:${port}`,
        };
      } else {
        console.warn("Invalid proxy format provided:", profileOptions.proxy);
        dialog.showErrorBox(
          "Proxy Error",
          `Invalid proxy format for profile "${profileOptions.name}". Using direct connection.`
        );
      }
    }

    // --- Cấu hình User Agent và Window Size cho args (dành cho headless=false) ---
    if (profileOptions.userAgent) {
      launchArgs.push(`--user-agent=${profileOptions.userAgent}`);
    }
    const windowWidth = profileOptions.width || 1920;
    const windowHeight = profileOptions.height || 1080;
    launchArgs.push(`--window-size=${windowWidth},${windowHeight}`);

    // Để đảm bảo thư mục user data là duy nhất cho mỗi profile
    const userDataDir = path.join(PROFILES_DIR, profileOptions.id); // Tạo thư mục riêng cho mỗi profile

    // --- Khởi động Trình duyệt Playwright ---
    browserInstance = await browserTypeLauncher.launchPersistentContext(
      userDataDir, // Sử dụng userDataDir để lưu profile
      {
        headless: false, // Mở trình duyệt có giao diện
        args: launchArgs, // Sử dụng launchArgs đã được thêm `--disable-blink-features=AutomationControlled`
        userAgent: profileOptions.userAgent, // Thiết lập User Agent ở cấp context
        viewport: {
          width: windowWidth,
          height: windowHeight,
        },
        locale: profileOptions.locale || "en-US",
        timezoneId: profileOptions.timezone || "America/New_York",
        proxy: Object.keys(proxyConfig).length > 0 ? proxyConfig : undefined, // Chỉ thêm proxy nếu có config hợp lệ
        // Thêm các cài đặt khác từ profileOptions vào đây
        // geolocation: { latitude: profileOptions.latitude, longitude: profileOptions.longitude },
        // permissions: ['geolocation'], // Cần cụ thể hóa quyền
      }
    );

    // --- Inject JavaScript để giả mạo các thuộc tính navigator và các API khác ---
    // SCRIPT CHỐNG PHÁT HIỆN CHÍNH
    await browserInstance.addInitScript(
      (options) => {
        // --- Chống phát hiện navigator.webdriver ---
        if (navigator.webdriver === false) {
          // Post Chrome 89.0.4339.0 and already good
        } else if (navigator.webdriver === undefined) {
          // Pre Chrome 89.0.4339.0 and already good
        } else {
          // Pre Chrome 88.0.4291.0 and needs patching (hoặc khi navigator.webdriver === true)
          try {
            delete Object.getPrototypeOf(navigator).webdriver;
          } catch (e) {
            // Fallback: nếu không thể xóa, cố gắng định nghĩa lại
            Object.defineProperty(navigator, "webdriver", {
              get: () => false,
            });
          }
        }
        // --- Giả mạo Platform ---
        Object.defineProperty(navigator, "platform", {
          get: () => options.platform,
        });

        // --- Giả mạo Vendor ---
        Object.defineProperty(navigator, "vendor", {
          get: () => options.vendor,
        });

        // --- Giả mạo WebGL (Đây là một ví dụ đơn giản, cần phức tạp hơn cho anti-detect thực sự) ---
        // Về cơ bản, bạn muốn thay đổi các chuỗi trả về từ WebGLRenderingContext.getParameter
        try {
          const getParameter = WebGLRenderingContext.prototype.getParameter;
          WebGLRenderingContext.prototype.getParameter = function (parameter) {
            // Giả mạo WebGL Renderer
            if (parameter === 37446 /* UNMASKED_RENDERER_WEBGL */) {
              return (
                options.webglRenderer ||
                "ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0, D3D11)"
              );
            }
            // Giả mạo WebGL Vendor
            if (parameter === 37445 /* UNMASKED_VENDOR_WEBGL */) {
              return options.webglVendor || "NVIDIA Corporation";
            }
            return getParameter.call(this, parameter);
          };
        } catch (e) {
          console.warn("Error spoofing WebGL:", e);
        }

        // --- Giả mạo Canvas Fingerprint (ví dụ đơn giản, cần phức tạp hơn) ---
        // Bằng cách thêm một nhiễu nhỏ không đáng kể vào dữ liệu canvas
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function () {
          const context = this.getContext("2d");
          if (context) {
            // Thêm một điểm ảnh nhỏ, gần như trong suốt
            context.fillStyle = "rgba(0, 0, 0, 0.01)";
            context.fillRect(0, 0, 1, 1);
          }
          return originalToDataURL.apply(this, arguments);
        };

        // --- Giả mạo Plugins ---
        // Playwright không cung cấp API trực tiếp để thay đổi navigator.plugins
        // Cần ghi đè getter của navigator.plugins
        Object.defineProperty(navigator, "plugins", {
          get: () => {
            const plugins = [
              {
                name: "Chrome PDF Viewer",
                description: "Portable Document Format",
                filename: "internal-pdf-viewer",
                length: 1,
              },
              // Thêm các plugin khác bạn muốn giả mạo
            ];
            // Để làm cho nó giống một mảng PluginArray thực sự
            plugins.item = (index) => plugins[index] || null;
            plugins.namedItem = (name) =>
              plugins.find((p) => p.name === name) || null;
            return plugins;
          },
        });

        // --- Giả mạo deviceMemory (RAM) ---
        Object.defineProperty(navigator, "deviceMemory", {
          get: () => options.deviceMemory || 8, // Ví dụ: 8GB RAM
        });

        // --- Giả mạo hardwareConcurrency (số lõi CPU) ---
        Object.defineProperty(navigator, "hardwareConcurrency", {
          get: () => options.hardwareConcurrency || 8, // Ví dụ: 8 lõi CPU
        });

        // --- Giả mạo WebRTC (cần proxy và IP ẩn danh) ---
        // Playwright tự xử lý tốt với proxy. Để đảm bảo không có WebRTC leak,
        // bạn cần đảm bảo proxy được cấu hình đúng và không có lỗi.
        // Các script phức tạp hơn có thể chặn các API WebRTC cụ thể.
      },
      {
        platform:
          profileOptions.platform ||
          (process.platform === "win32"
            ? "Win32"
            : process.platform === "darwin"
            ? "MacIntel"
            : "Linux"),
        vendor:
          profileOptions.vendor ||
          (profileOptions.browserType === "Firefox"
            ? ""
            : profileOptions.browserType === "WebKit"
            ? "Apple Computer, Inc."
            : "Google Inc."),
        webglRenderer: profileOptions.webglRenderer, // Truyền từ profile
        webglVendor: profileOptions.webglVendor, // Truyền từ profile
        deviceMemory: profileOptions.deviceMemory,
        hardwareConcurrency: profileOptions.hardwareConcurrency,
        // ... thêm các giá trị khác từ profileOptions vào đây
      }
    );

    const page = await browserInstance.newPage(); // Tạo một trang mới trong context đã cấu hình

    await page.goto(profileOptions.startUrl || "https://bot.sannysoft.com/"); // Trang kiểm tra dấu vân tay

    console.log(
      `Playwright browser for profile "${profileOptions.name}" launched and navigated.`
    );

    // Listen for browser close/disconnect events
    browserInstance.on("disconnected", () => {
      console.log(
        `Playwright browser for profile "${profileOptions.name}" disconnected.`
      );
    });

    event.reply("browser-launched-success", {
      success: true,
      message: `Profile "${profileOptions.name}" launched.`,
    });
  } catch (error) {
    console.error(
      `Error launching Playwright browser for profile "${profileOptions.name}":`,
      error
    );
    event.reply("browser-launched-error", {
      success: false,
      message: `Failed to launch profile "${profileOptions.name}": ${error.message}`,
      details: error.stack,
    });
    if (browserInstance) {
      await browserInstance.close();
    }
  }
});
