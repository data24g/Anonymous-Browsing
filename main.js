const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const Store = require("electron-store");
const { v4: uuidv4 } = require("uuid");

// Bộ công cụ ổn định
const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
chromium.use(stealth);

// Chỉ sử dụng generator
const { FingerprintGenerator } = require("fingerprint-generator");

let proxyStore;
const PROFILES_DIR = path.join(__dirname, "profiles");

// --- HÀM GENERATE RANDOM FINGERPRINTS CHO MỖI SESSION ---
function generateRandomHash() {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateRandomWebGLVendor() {
  const vendors = [
    "Google Inc. (Intel)",
    "Intel Inc.", 
    "Google Inc. (AMD)",
    "NVIDIA Corporation",
    "Google Inc. (NVIDIA)",
    "AMD Inc.",
    "Intel",
    "Qualcomm",
    "VMware, Inc.",
    "Microsoft Corporation",
    "Apple Inc.",
    "ARM"
  ];
  return vendors[Math.floor(Math.random() * vendors.length)];
}

function generateRandomWebGLRenderer() {
  const renderers = [
    "ANGLE (Intel, Intel(R) UHD Graphics (0x00009A68) Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "Intel Iris OpenGL Engine",
    "ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "ANGLE (AMD, Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "ANGLE (NVIDIA, GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "ANGLE (Google, SwiftShader Device (Subzero) Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "Google SwiftShader",
    "Mesa DRI Intel(R) HD Graphics",
    "AMD Radeon Graphics",
    "NVIDIA GeForce GTX 1080 Ti OpenGL Engine",
    "AMD Radeon Pro 5600M OpenGL Engine"
  ];
  return renderers[Math.floor(Math.random() * renderers.length)];
}

// --- Các hàm tiện ích ---
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function normalizeProxyServerUrl(serverString) {
  if (!serverString) return "";
  const lowerCaseServerString = serverString.toLowerCase();
  if (
    lowerCaseServerString.startsWith("http://") ||
    lowerCaseServerString.startsWith("https://") ||
    lowerCaseServerString.startsWith("socks5://")
  ) {
    return serverString;
  }
  return `http://${serverString}`;
}

async function getGeoInfoFromIp(ip) {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();
    if (data.status === "success" && data.timezone) {
      const langCode = data.countryCode.toLowerCase();
      const locale = `${langCode}-${data.countryCode}`;
      return {
        timezoneId: data.timezone,
        latitude: data.lat,
        longitude: data.lon,
        countryCode: data.countryCode,
        locale: locale,
      };
    } else {
      console.warn(
        `Could not get geo info for IP ${ip}:`,
        data.message || "Unknown error"
      );
      return null;
    }
  } catch (error) {
    console.error(`Failed to fetch geo info for IP ${ip}:`, error);
    return null;
  }
}

// --- Cửa sổ chính của Electron ---
let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });
  mainWindow.loadFile("index.html");
}

app.whenReady().then(async () => {
  ensureDirectory(PROFILES_DIR);
  createWindow();
  proxyStore = new Store({ name: "proxies" });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ========================================================================
// IPC Handlers - TẠO PROFILE
// ========================================================================
ipcMain.handle("create-profile", async (event, { 
  profileName, 
  proxyName,
  customSettings 
}) => {
  if (!profileName || typeof profileName !== "string") {
    return { success: false, message: "Invalid profile name." };
  }
  const profilePath = path.join(PROFILES_DIR, profileName);
  if (fs.existsSync(profilePath)) {
    return {
      success: false,
      message: `Profile '${profileName}' already exists.`,
    };
  }
  try {
    fs.mkdirSync(profilePath, { recursive: true });
    
    const fingerprintGenerator = new FingerprintGenerator({
      devices: ["desktop"],
      operatingSystems: ["windows"],
      browsers: [{ name: "chrome", minVersion: 115 }],
    });
    const fingerprint = fingerprintGenerator.getFingerprint();

    if (!fingerprint.navigator) {
      fingerprint.navigator = {};
    }

    // ========================================================================
    // ÁP DỤNG CÀI ĐẶT TÙY CHỈNH VÀO FINGERPRINT THỰC TẾ
    // ========================================================================
    if (customSettings) {
      // 1. Áp dụng ngôn ngữ
      if (customSettings.language && customSettings.language !== 'auto') {
        fingerprint.navigator.language = customSettings.language;
        fingerprint.navigator.languages = [customSettings.language, customSettings.language.split('-')[0]];
      } else {
        // Mặc định tiếng Anh nếu chọn auto
        fingerprint.navigator.language = "en-US";
        fingerprint.navigator.languages = ["en-US", "en"];
      }

      // 2. Áp dụng User Agent
      if (customSettings.userAgent && customSettings.userAgent !== 'auto') {
        fingerprint.navigator.userAgent = customSettings.userAgent;
      }

      // 3. Áp dụng phần cứng GPU - TẠO FINGERPRINT THỰC TẾ
      if (customSettings.hardware && customSettings.hardware !== 'auto') {
        // Tạo WebGL fingerprint dựa trên phần cứng được chọn
        const hardwareConfigs = {
          'rtx3060': {
            vendor: 'NVIDIA Corporation',
            renderer: 'NVIDIA GeForce RTX 3060/PCIe/SSE2',
            version: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)'
          },
          'rtx3060ti': {
            vendor: 'NVIDIA Corporation', 
            renderer: 'NVIDIA GeForce RTX 3060 Ti/PCIe/SSE2',
            version: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)'
          },
          'rtx3070': {
            vendor: 'NVIDIA Corporation',
            renderer: 'NVIDIA GeForce RTX 3070/PCIe/SSE2',
            version: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)'
          },
          'rtx3080': {
            vendor: 'NVIDIA Corporation',
            renderer: 'NVIDIA GeForce RTX 3080/PCIe/SSE2',
            version: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)'
          },
          'rtx4090': {
            vendor: 'NVIDIA Corporation',
            renderer: 'NVIDIA GeForce RTX 4090/PCIe/SSE2',
            version: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)'
          },
          'rx6700xt': {
            vendor: 'AMD',
            renderer: 'AMD Radeon RX 6700 XT',
            version: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)'
          },
          'rx6800': {
            vendor: 'AMD',
            renderer: 'AMD Radeon RX 6800',
            version: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)'
          },
          'intel_iris': {
            vendor: 'Intel',
            renderer: 'Intel(R) Iris(R) Xe Graphics',
            version: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)'
          },
          'intel_uhd': {
            vendor: 'Intel',
            renderer: 'Intel(R) UHD Graphics',
            version: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)'
          }
        };

        const hardwareConfig = hardwareConfigs[customSettings.hardware];
        if (hardwareConfig) {
          fingerprint.customHardware = customSettings.hardware;
          fingerprint.webglVendor = hardwareConfig.vendor;
          fingerprint.webglRenderer = hardwareConfig.renderer;
          fingerprint.webglVersion = hardwareConfig.version;
        }
      }

      // 4. Áp dụng độ phân giải màn hình - ĐẢM BẢO SỐ NGUYÊN
      if (customSettings.screenResolution && customSettings.screenResolution !== 'auto') {
        const [width, height] = customSettings.screenResolution.split('x').map(Number);
        if (width && height) {
          fingerprint.screen = {
            width: Math.round(width),
            height: Math.round(height),
            availWidth: Math.round(width - 100),
            availHeight: Math.round(height - 100),
            colorDepth: 24,
            pixelDepth: 24
          };
          fingerprint.videoCard = [`GPU with ${width}x${height} resolution`];
        }
      }
    } else {
      // Mặc định nếu không có custom settings - ĐẢM BẢO SỐ NGUYÊN
      fingerprint.navigator.language = "en-US";
      fingerprint.navigator.languages = ["en-US", "en"];
      
      // Đảm bảo screen resolution là số nguyên
      if (fingerprint.screen) {
        fingerprint.screen.width = Math.round(fingerprint.screen.width);
        fingerprint.screen.height = Math.round(fingerprint.screen.height);
        fingerprint.screen.availWidth = Math.round(fingerprint.screen.availWidth);
        fingerprint.screen.availHeight = Math.round(fingerprint.screen.availHeight);
      }
    }

    const profileConfig = {
      name: profileName,
      createdAt: new Date().toISOString(),
      proxyName: proxyName || null,
      fingerprint: fingerprint,
      customSettings: customSettings || {}
    };
    
    fs.writeFileSync(
      path.join(profilePath, "config.json"),
      JSON.stringify(profileConfig, null, 2)
    );
    fs.mkdirSync(path.join(profilePath, "user-data"));
    
    return {
      success: true,
      message: `Profile '${profileName}' created successfully.`,
    };
  } catch (error) {
    console.error("Error creating profile:", error);
    return {
      success: false,
      message: `Failed to create profile: ${error.message}`,
    };
  }
});

ipcMain.handle("get-profiles", async () => {
  ensureDirectory(PROFILES_DIR);
  try {
    const profileNames = fs
      .readdirSync(PROFILES_DIR, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
    return profileNames.map((name) => ({ name }));
  } catch (error) {
    console.error("Error getting profiles:", error);
    return [];
  }
});

ipcMain.handle("delete-profile", async (event, profileName) => {
  if (!profileName) return { success: false, message: "Invalid profile name." };
  const profilePath = path.join(PROFILES_DIR, profileName);
  if (!fs.existsSync(profilePath)) {
    return {
      success: false,
      message: `Profile '${profileName}' does not exist.`,
    };
  }
  try {
    fs.rmSync(profilePath, { recursive: true, force: true });
    return {
      success: true,
      message: `Profile '${profileName}' deleted successfully.`,
    };
  } catch (error) {
    console.error("Error deleting profile:", error);
    return {
      success: false,
      message: `Failed to delete profile: ${error.message}`,
    };
  }
});

ipcMain.handle("get-profile-config", async (event, profileName) => {
  const configFile = path.join(PROFILES_DIR, profileName, "config.json");
  if (fs.existsSync(configFile)) {
    try {
      const config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
      return { success: true, config };
    } catch (error) {
      return { success: false, message: "Failed to read profile config." };
    }
  }
  return { success: false, message: "Profile config not found." };
});

ipcMain.handle(
  "update-profile-config",
  async (event, profileName, newConfigData) => {
    const configFile = path.join(PROFILES_DIR, profileName, "config.json");
    if (fs.existsSync(configFile)) {
      try {
        const existingConfig = JSON.parse(fs.readFileSync(configFile, "utf-8"));
        const mergedConfig = { ...existingConfig, ...newConfigData };
        fs.writeFileSync(configFile, JSON.stringify(mergedConfig, null, 2));
        return {
          success: true,
          message: "Profile config updated successfully.",
        };
      } catch (error) {
        console.error(`Error updating config for ${profileName}:`, error);
        return {
          success: false,
          message: `Failed to update profile config: ${error.message}`,
        };
      }
    }
    return { success: false, message: "Profile config not found." };
  }
);

// --- Mở Trình duyệt ---
ipcMain.handle("open-browser", async (event, profileName, url) => {
  const targetUrl = url || "https://pixelscan.net/";
  const profilePath = path.join(PROFILES_DIR, profileName);
  const userDataDir = path.join(profilePath, "user-data");
  const configFile = path.join(profilePath, "config.json");

  if (!fs.existsSync(configFile)) {
    return {
      success: false,
      message: `Config not found for '${profileName}'.`,
    };
  }

  // --- DỌN DẸP PROFILE TRIỆT ĐỂ ---
  try {
    const defaultProfilePath = path.join(userDataDir, "Default");
    const preferencesPath = path.join(defaultProfilePath, "Preferences");
    const sessionStoragePath = path.join(defaultProfilePath, "Session Storage");
    const localStoragePath = path.join(defaultProfilePath, "Local Storage");
    
    if (fs.existsSync(preferencesPath)) {
      fs.rmSync(preferencesPath, { force: true });
    }
    if (fs.existsSync(sessionStoragePath)) {
      fs.rmSync(sessionStoragePath, { recursive: true, force: true });
    }
    if (fs.existsSync(localStoragePath)) {
      fs.rmSync(localStoragePath, { recursive: true, force: true });
    }
    
    console.log(`🧹 Cleaned ALL profile data for '${profileName}'.`);
  } catch (e) {
    console.error(
      `Could not clean profile data for '${profileName}':`,
      e
    );
  }

  let browserContext = null;
  try {
    const profileConfig = JSON.parse(fs.readFileSync(configFile, "utf-8"));
    const fingerprintData = profileConfig.fingerprint;
    if (!fingerprintData || !fingerprintData.fingerprint) {
      return {
        success: false,
        message: "Fingerprint data is invalid or missing.",
      };
    }
    const fingerprint = fingerprintData.fingerprint;

    // ========================================================================
    // TẠO HASH NGẪU NHIÊN CHO MỖI LẦN MỞ BROWSER
    // ========================================================================
    const canvasHash = generateRandomHash();
    const webglHash = generateRandomHash();
    const audioHash = generateRandomHash();

    console.log(`🎲 Generated RANDOM hashes for session:`);
    console.log(`   Canvas: ${canvasHash}`);
    console.log(`   WebGL: ${webglHash}`);
    console.log(`   Audio: ${audioHash}`);

    let playwrightProxyConfig = undefined;
    let finalTimezone = fingerprint.timezoneId;
    let finalLocale = fingerprint.navigator?.language || "en-US";
    let finalGeolocation = fingerprint.geolocation;

    if (profileConfig.proxyName) {
      const allProxies = proxyStore.get("list", []);
      const selectedProxy = allProxies.find(
        (p) => p.name === profileConfig.proxyName
      );
      if (selectedProxy) {
        playwrightProxyConfig = {
          server: selectedProxy.server,
          username: selectedProxy.username,
          password: selectedProxy.password,
        };
        if (selectedProxy.timezoneId) finalTimezone = selectedProxy.timezoneId;
        if (
          selectedProxy.latitude !== undefined &&
          selectedProxy.longitude !== undefined
        ) {
          finalGeolocation = {
            latitude: selectedProxy.latitude,
            longitude: selectedProxy.longitude,
            accuracy: Math.floor(Math.random() * 30 + 10),
          };
        }
      }
    }

    // ========================================================================
    // SỬ DỤNG CÀI ĐẶT PHẦN CỨNG TỪ PROFILE CONFIG
    // ========================================================================
    const customSettings = profileConfig.customSettings || {};
    const selectedHardware = customSettings.hardware || 'auto';
    
    // Lấy thông tin WebGL từ profile config nếu có
    const profileWebglVendor = fingerprintData.webglVendor || generateRandomWebGLVendor();
    const profileWebglRenderer = fingerprintData.webglRenderer || generateRandomWebGLRenderer();
    const profileWebglVersion = fingerprintData.webglVersion || "WebGL 1.0 (OpenGL ES 2.0 Chromium)";

    // ========================================================================
    // LẤY ĐỘ PHÂN GIẢI CHÍNH XÁC TỪ PROFILE CONFIG - FIX QUAN TRỌNG
    // ========================================================================
    let finalScreenWidth = Math.round(fingerprint.screen?.width || 1920);
    let finalScreenHeight = Math.round(fingerprint.screen?.height || 1080);

    // ƯU TIÊN độ phân giải từ custom settings nếu có
    if (customSettings.screenResolution && customSettings.screenResolution !== 'auto') {
      const [customWidth, customHeight] = customSettings.screenResolution.split('x').map(Number);
      if (customWidth && customHeight) {
        finalScreenWidth = Math.round(customWidth);
        finalScreenHeight = Math.round(customHeight);
        console.log(`🎯 Using CUSTOM screen resolution: ${finalScreenWidth}x${finalScreenHeight}`);
      }
    } else {
      console.log(`🎯 Using PROFILE screen resolution: ${finalScreenWidth}x${finalScreenHeight}`);
    }

    console.log(`📐 SCREEN RESOLUTION CONFIG:`);
    console.log(`   Profile: ${Math.round(fingerprint.screen?.width)}x${Math.round(fingerprint.screen?.height)}`);
    console.log(`   Custom: ${customSettings.screenResolution}`);
    console.log(`   Final: ${finalScreenWidth}x${finalScreenHeight}`);

    // 🔧 SESSION FINGERPRINTS VỚI HASH NGẪU NHIÊN
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const sessionFingerprints = {
      // SỬ DỤNG HASH NGẪU NHIÊN CHO MỖI SESSION
      canvasHash: canvasHash,
      webglHash: webglHash,
      audioHash: audioHash,
      
      webglVendor: profileWebglVendor,
      webglRenderer: profileWebglRenderer, 
      webglVersion: profileWebglVersion,
      
      sessionId: sessionId,
      timestamp: Date.now(),
      webglSeed: Math.floor(Math.random() * 1000000),
      audioSeed: Math.floor(Math.random() * 1000000),
      canvasSeed: Math.floor(Math.random() * 1000000),
      selectedHardware: selectedHardware,
      screenWidth: finalScreenWidth,
      screenHeight: finalScreenHeight
    };

    console.log(`🆕 NEW SESSION: ${sessionId}`);
    console.log(`🎯 Profile Hardware: ${selectedHardware}`);
    console.log(`🎲 Random Canvas Hash: ${canvasHash}`);
    console.log(`🎲 Random WebGL Hash: ${webglHash}`);
    console.log(`🎲 Random Audio Hash: ${audioHash}`);

    // Accept-Language header từ profile config
    const acceptLanguageHeader = fingerprint.navigator?.languages ? 
      fingerprint.navigator.languages.join(',') : "en-US,en;q=0.9";

    // Đường dẫn đến extension WebRTC Blocker
    const extensionPath = path.join(__dirname, "webrtc-blocker-extension");

    // Đảm bảo không có browser context nào đang chạy
    try {
      const existingContexts = browserContext ? [browserContext] : [];
      for (const context of existingContexts) {
        await context.close().catch(() => {});
      }
    } catch (e) {
      console.log("No existing contexts to close");
    }

    // ======================================================
    // FINGERPRINT SCRIPT VỚI HASH NGẪU NHIÊN - ĐÃ FIX SCREEN RESOLUTION
    // ======================================================
    const fingerprintScript = `
    // === FINGERPRINT PROTECTION - VỚI HASH NGẪU NHIÊN ===
    (function() {
      const sessionFingerprints = ${JSON.stringify(sessionFingerprints)};
      const profileLanguage = "${finalLocale}";
      const profileHardware = "${selectedHardware}";
      const finalScreenWidth = ${finalScreenWidth};
      const finalScreenHeight = ${finalScreenHeight};
      
      console.log("🛡️ Applying RANDOM fingerprint protection...");
      console.log("🎲 Random Canvas Hash:", sessionFingerprints.canvasHash);
      console.log("🎲 Random WebGL Hash:", sessionFingerprints.webglHash);
      console.log("🎲 Random Audio Hash:", sessionFingerprints.audioHash);
      console.log("📐 Screen Resolution:", finalScreenWidth + "x" + finalScreenHeight);
      
      // === GHI ĐÈ NAVIGATOR PROPERTIES ĐỂ PHÙ HỢP VỚI PROFILE ===
      if (profileLanguage && profileLanguage !== 'auto') {
        Object.defineProperty(navigator, 'language', {
          get: function() { return profileLanguage; },
          configurable: false
        });
        
        Object.defineProperty(navigator, 'languages', {
          get: function() { return [profileLanguage, profileLanguage.split('-')[0]]; },
          configurable: false
        });
      }

      // === SCREEN PROPERTIES - ÁP DỤNG ĐỘ PHÂN GIẢI TỪ PROFILE (SỐ NGUYÊN) ===
      Object.defineProperty(screen, 'width', {
        get: function() { return finalScreenWidth; },
        configurable: false
      });
      
      Object.defineProperty(screen, 'height', {
        get: function() { return finalScreenHeight; },
        configurable: false
      });
      
      Object.defineProperty(screen, 'availWidth', {
        get: function() { return finalScreenWidth - 100; },
        configurable: false
      });
      
      Object.defineProperty(screen, 'availHeight', {
        get: function() { return finalScreenHeight - 100; },
        configurable: false
      });

      // === DEVICE PIXEL RATIO FIX ===
      Object.defineProperty(window, 'devicePixelRatio', {
        get: function() { return 1; },
        configurable: false
      });

      // Fix cho các properties khác của screen
      Object.defineProperty(screen, 'colorDepth', {
        get: function() { return 24; },
        configurable: false
      });

      Object.defineProperty(screen, 'pixelDepth', {
        get: function() { return 24; },
        configurable: false
      });

      // === CANVAS FINGERPRINT PROTECTION VỚI HASH NGẪU NHIÊN ===
      if (window.CanvasRenderingContext2D) {
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        
        // GHI ĐÈ GETIMAGEDATA - TẠO CANVAS HASH NGẪU NHIÊN
        CanvasRenderingContext2D.prototype.getImageData = function (...args) {
          const imageData = originalGetImageData.apply(this, args);
          
          if (imageData && imageData.data) {
            const data = imageData.data;
            const canvasHash = sessionFingerprints.canvasHash;
            
            // Tạo pattern ngẫu nhiên từ hash
            let hashSum = 0;
            for (let i = 0; i < canvasHash.length; i++) {
              hashSum += canvasHash.charCodeAt(i);
            }
            
            // Áp dụng noise pattern NGẪU NHIÊN dựa trên canvas hash
            for (let i = 0; i < data.length; i += 4) {
              const pixelIndex = i / 4;
              const xPos = pixelIndex % (args[2] || 256);
              const yPos = Math.floor(pixelIndex / (args[2] || 256));
              
              // Tạo noise NGẪU NHIÊN cho mỗi pixel
              const positionFactor = (xPos * 11 + yPos * 17) % 23;
              const hashFactor = (hashSum + i) % 19;
              const timeFactor = (sessionFingerprints.timestamp + i) % 13;
              const seedFactor = sessionFingerprints.canvasSeed % 7;
              
              const finalNoise = (positionFactor + hashFactor + timeFactor + seedFactor) % 8;
              
              data[i] = (data[i] + finalNoise) % 256;
              data[i + 1] = (data[i + 1] + finalNoise * 2) % 256;
              data[i + 2] = (data[i + 2] + finalNoise * 3) % 256;
            }
          }
          return imageData;
        };

        console.log("✅ Canvas protection applied - Random Hash:", sessionFingerprints.canvasHash);
      }

      // === WEBGL PROTECTION VỚI HASH NGẪU NHIÊN ===
      if (typeof WebGLRenderingContext !== "undefined") {
        const WebGL = WebGLRenderingContext;
        
        const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (parameter) {
          const webglHash = sessionFingerprints.webglHash;
          let hashSum = 0;
          for (let i = 0; i < webglHash.length; i++) {
            hashSum += webglHash.charCodeAt(i);
          }
          
          const parameterMap = {
            // SỬ DỤNG GIÁ TRỊ TỪ PROFILE CONFIG
            [WebGL.VENDOR]: sessionFingerprints.webglVendor,
            [WebGL.RENDERER]: sessionFingerprints.webglRenderer,
            [WebGL.VERSION]: sessionFingerprints.webglVersion,
            
            // Unmasked vendors - QUAN TRỌNG
            37445: sessionFingerprints.webglVendor,
            37446: sessionFingerprints.webglRenderer,
            
            // Hardware limits - PHÙ HỢP VỚI PHẦN CỨNG ĐƯỢC CHỌN
            [WebGL.MAX_TEXTURE_SIZE]: profileHardware.includes('rtx') ? 16384 : 8192,
            [WebGL.MAX_RENDERBUFFER_SIZE]: profileHardware.includes('rtx') ? 16384 : 8192,
            [WebGL.MAX_VIEWPORT_DIMS]: profileHardware.includes('rtx') ? [16384, 16384] : [8192, 8192],
            [WebGL.MAX_CUBE_MAP_TEXTURE_SIZE]: profileHardware.includes('rtx') ? 16384 : 8192,
            [WebGL.MAX_VERTEX_TEXTURE_IMAGE_UNITS]: profileHardware.includes('rtx') ? 32 : 16,
            [WebGL.MAX_TEXTURE_IMAGE_UNITS]: profileHardware.includes('rtx') ? 32 : 16,
          };

          if (parameterMap[parameter] !== undefined) {
            return parameterMap[parameter];
          }

          try {
            const result = originalGetParameter.call(this, parameter);
            
            // THÊM BIẾN THỂ NGẪU NHIÊN CHO TẤT CẢ KẾT QUẢ
            if (typeof result === 'number') {
              const variant = (hashSum + parameter) % 1000;
              return result + (variant * 0.000001);
            }
            
            return result;
          } catch (e) {
            return null;
          }
        };

        // GHI ĐÈ READPIXELS - THÊM NOISE NGẪU NHIÊN
        const originalReadPixels = WebGLRenderingContext.prototype.readPixels;
        WebGLRenderingContext.prototype.readPixels = function (x, y, width, height, format, type, pixels) {
          const result = originalReadPixels.call(this, x, y, width, height, format, type, pixels);
          
          if (pixels && pixels.length > 0) {
            const targetHash = sessionFingerprints.webglHash;
            let hashSum = 0;
            for (let i = 0; i < targetHash.length; i++) {
              hashSum += targetHash.charCodeAt(i);
            }
            
            // Áp dụng noise pattern NGẪU NHIÊN
            for (let i = 0; i < pixels.length; i += 4) {
              const pixelIndex = i / 4;
              const xPos = pixelIndex % width;
              const yPos = Math.floor(pixelIndex / width);
              
              // Tạo noise ngẫu nhiên cho mỗi pixel
              const positionFactor = (xPos * 7 + yPos * 13) % 17;
              const hashFactor = (hashSum + i) % 11;
              const timeFactor = (sessionFingerprints.timestamp + i) % 7;
              
              const finalNoise = (positionFactor + hashFactor + timeFactor) % 5;
              
              pixels[i] = (pixels[i] + finalNoise) % 256;
              pixels[i + 1] = (pixels[i + 1] + finalNoise) % 256;
              pixels[i + 2] = (pixels[i + 2] + finalNoise) % 256;
            }
          }
          
          return result;
        };

        console.log("✅ WebGL protection applied - Random Hash:", sessionFingerprints.webglHash);
      }

      // === AUDIOCONTEXT PROTECTION VỚI HASH NGẪU NHIÊN ===
      if (window.OfflineAudioContext) {
        const OriginalOfflineAudioContext = window.OfflineAudioContext;
        const audioHash = sessionFingerprints.audioHash;
        let audioHashSum = 0;
        for (let i = 0; i < audioHash.length; i++) {
          audioHashSum += audioHash.charCodeAt(i);
        }
        
        window.OfflineAudioContext = function(numberOfChannels, length, sampleRate) {
          console.log("🎵 Creating protected OfflineAudioContext with random hash");
          
          // Thay đổi các tham số để tạo hash ngẫu nhiên
          const modifiedSampleRate = sampleRate + (audioHashSum % 100);
          const modifiedLength = length + (audioHashSum % 512);
          
          const context = new OriginalOfflineAudioContext(
            numberOfChannels, 
            modifiedLength, 
            modifiedSampleRate
          );
          
          // Ghi đè createAnalyser
          const originalCreateAnalyser = context.createAnalyser;
          context.createAnalyser = function() {
            const analyser = originalCreateAnalyser.call(this);
            
            // Fake frequencyBinCount ngẫu nhiên
            const fakeFreqBin = 1024 + (audioHashSum % 256);
            Object.defineProperty(analyser, 'frequencyBinCount', {
              get: function() {
                return fakeFreqBin;
              },
              configurable: false
            });
            
            // Ghi đè getByteFrequencyData với hash ngẫu nhiên
            const originalGetByteFrequencyData = analyser.getByteFrequencyData;
            analyser.getByteFrequencyData = function(array) {
              const result = originalGetByteFrequencyData.call(this, array);
              
              if (array && array.length > 0) {
                for (let i = 0; i < array.length; i++) {
                  const positionFactor = (i * audioHashSum) % 127;
                  const timeFactor = (sessionFingerprints.timestamp + i) % 63;
                  const noise = (positionFactor + timeFactor) % 32;
                  array[i] = (array[i] + noise) % 256;
                }
              }
              return result;
            };
            
            return analyser;
          };
          
          return context;
        };
        
        window.OfflineAudioContext.prototype = OriginalOfflineAudioContext.prototype;
      }

      // AudioContext protection với hash ngẫu nhiên
      if (window.AudioContext || window.webkitAudioContext) {
        const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
        const audioHash = sessionFingerprints.audioHash;
        let audioHashSum = 0;
        for (let i = 0; i < audioHash.length; i++) {
          audioHashSum += audioHash.charCodeAt(i);
        }
        
        window.AudioContext = function(contextOptions) {
          const audioContext = new OriginalAudioContext(contextOptions);
          
          // Fake currentTime ngẫu nhiên
          const timeOffset = (audioHashSum % 10000) / 100000;
          Object.defineProperty(audioContext, 'currentTime', {
            get: function() {
              const realTime = Object.getOwnPropertyDescriptor(
                OriginalAudioContext.prototype, 
                'currentTime'
              ).get.call(this);
              return realTime + timeOffset;
            },
            configurable: false
          });

          // Fake sampleRate ngẫu nhiên
          const originalSampleRate = audioContext.sampleRate;
          Object.defineProperty(audioContext, 'sampleRate', {
            get: function() {
              return originalSampleRate + (audioHashSum % 50);
            },
            configurable: false
          });

          return audioContext;
        };
        
        window.AudioContext.prototype = OriginalAudioContext.prototype;
        if (window.webkitAudioContext) {
          window.webkitAudioContext = window.AudioContext;
        }

        console.log("✅ AudioContext protection applied - Random Hash:", sessionFingerprints.audioHash);
      }

      console.log("✅ ALL random fingerprint protections applied successfully");
      console.log("✅ Screen properties fixed - Resolution: " + finalScreenWidth + "x" + finalScreenHeight);
      console.log("🎲 Final Random Hashes - Canvas:", sessionFingerprints.canvasHash, "WebGL:", sessionFingerprints.webglHash, "Audio:", sessionFingerprints.audioHash);
    })();
    `;

    // ĐẢM BẢO viewport và screen properties KHỚP NHAU
    browserContext = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      proxy: playwrightProxyConfig,
      userAgent: fingerprint.navigator.userAgent,
      locale: finalLocale,
      timezoneId: finalTimezone,
      geolocation: finalGeolocation,
      // QUAN TRỌNG: Viewport phải khớp với screen properties
      viewport: {
        width: finalScreenWidth,
        height: finalScreenHeight,
      },
      // THÊM screen option để đồng bộ hóa
      screen: {
        width: finalScreenWidth,
        height: finalScreenHeight
      },
      extraHTTPHeaders: {
        ...fingerprintData.headers,
        "accept-language": acceptLanguageHeader,
      },
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
        "--disable-features=WebRtcHideLocalIpsWithMdns",
        "--disable-blink-features=AutomationControlled",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--disable-site-isolation-trials",
        "--ignore-gpu-blocklist",
        "--enable-gpu-rasterization",
        "--enable-zero-copy",
        "--disable-gpu-sandbox",
        "--enable-webgl",
        "--enable-webgl-draft-extensions",
        "--enable-accelerated-2d-canvas",
        "--use-angle=gl",
        "--max-active-webgl-contexts=32",
        "--enable-experimental-web-platform-features",
        "--disk-cache-dir=/dev/null",
        "--disable-application-cache",
        "--enable-audio-service",
        "--audio-buffer-size=2048",
        "--disable-audio-output",
        // THÊM các args để fix screen resolution
        `--window-size=${finalScreenWidth},${finalScreenHeight}`,
        `--window-position=0,0`
      ],
      ignoreDefaultArgs: [
        "--enable-automation",
        "--disable-background-timer-throttling",
      ],
      timeout: 60000,
    });

    // Áp dụng fingerprint script cho tất cả pages
    const applyFingerprintToAllPages = async () => {
      const existingPages = browserContext.pages();
      for (const page of existingPages) {
        try {
          await page.addInitScript(fingerprintScript);
          console.log(`✅ Applied random fingerprint protection`);
        } catch (error) {
          console.error(`❌ Failed to apply protection:`, error);
        }
      }

      browserContext.on("page", async (newPage) => {
        console.log(`🔄 New page detected, applying random protection...`);
        try {
          await newPage.addInitScript(fingerprintScript);
          console.log(`✅ Applied random protection to new page`);
        } catch (error) {
          console.error(`❌ Failed to apply protection to new page:`, error);
        }
      });
    };

    await applyFingerprintToAllPages();

    // Chuyển đến URL đích
    const pages = browserContext.pages();
    if (pages.length > 0) {
      await pages[0].goto(targetUrl);
      console.log(`🌐 Navigated to: ${targetUrl}`);
    }

    return { 
      success: true, 
      message: `Browser for '${profileName}' opened with RANDOM fingerprints.`,
      fingerprints: {
        canvasHash: canvasHash,
        webglHash: webglHash,
        audioHash: audioHash,
        sessionId: sessionId,
        hardware: selectedHardware,
        language: finalLocale,
        resolution: `${finalScreenWidth}x${finalScreenHeight}`,
        source: customSettings.screenResolution !== 'auto' ? 'custom' : 'profile'
      }
    };
  } catch (error) {
    console.error(
      `❌ Error opening browser for profile ${profileName}:`,
      error
    );
    if (browserContext) {
      try {
        await browserContext.close();
      } catch (e) {
        console.error("Error closing context on failure:", e);
      }
    }
    return {
      success: false,
      message: `Failed to open browser: ${error.message}`,
    };
  }
});

// --- Quản lý Proxy ---
ipcMain.handle("get-proxies", async () => {
  if (!proxyStore) return [];
  return proxyStore.get("list", []);
});

ipcMain.handle("add-proxy", async (event, proxyConfig) => {
  if (!proxyStore) return { success: false, message: "Proxy store not ready." };
  let proxies = proxyStore.get("list", []);
  if (!proxyConfig || !proxyConfig.name || !proxyConfig.server) {
    return { success: false, message: "Invalid proxy configuration." };
  }
  if (proxies.some((p) => p.name === proxyConfig.name)) {
    return {
      success: false,
      message: `Proxy '${proxyConfig.name}' already exists.`,
    };
  }
  proxyConfig.server = normalizeProxyServerUrl(proxyConfig.server);
  const ipMatch = proxyConfig.server.match(
    /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/
  );
  if (ipMatch && ipMatch[1]) {
    const geoInfo = await getGeoInfoFromIp(ipMatch[1]);
    if (geoInfo) {
      proxyConfig = { ...proxyConfig, ...geoInfo };
    }
  }
  proxies.push(proxyConfig);
  proxyStore.set("list", proxies);
  return { success: true, message: `Proxy '${proxyConfig.name}' added.` };
});

ipcMain.handle("update-proxy", async (event, oldName, newConfig) => {
  if (!proxyStore) return { success: false, message: "Proxy store not ready." };
  let proxies = proxyStore.get("list", []);
  const index = proxies.findIndex((p) => p.name === oldName);
  if (index === -1) {
    return { success: false, message: `Proxy '${oldName}' not found.` };
  }
  if (
    oldName !== newConfig.name &&
    proxies.some((p) => p.name === newConfig.name)
  ) {
    return {
      success: false,
      message: `Proxy name '${newConfig.name}' already exists.`,
    };
  }
  newConfig.server = normalizeProxyServerUrl(newConfig.server);
  const oldProxy = proxies[index];
  const serverChanged = oldProxy.server !== newConfig.server;
  if (serverChanged) {
    const ipMatch = newConfig.server.match(
      /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/
    );
    if (ipMatch && ipMatch[1]) {
      const geoInfo = await getGeoInfoFromIp(ipMatch[1]);
      if (geoInfo) {
        newConfig = { ...newConfig, ...geoInfo };
      }
    } else {
      delete newConfig.timezoneId;
      delete newConfig.latitude;
      delete newConfig.longitude;
      delete newConfig.locale;
    }
  }
  proxies[index] = { ...oldProxy, ...newConfig };
  proxyStore.set("list", proxies);
  return { success: true, message: `Proxy '${newConfig.name}' updated.` };
});

ipcMain.handle("delete-proxy", async (event, proxyName) => {
  if (!proxyStore) return { success: false, message: "Proxy store not ready." };
  let proxies = proxyStore.get("list", []);
  const initialLength = proxies.length;
  proxies = proxies.filter((p) => p.name !== proxyName);
  if (proxies.length < initialLength) {
    proxyStore.set("list", proxies);
    return { success: true, message: `Proxy '${proxyName}' deleted.` };
  } else {
    return { success: false, message: `Proxy '${proxyName}' not found.` };
  }
});