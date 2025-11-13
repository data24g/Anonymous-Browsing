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
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
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
// IPC Handlers
// ========================================================================
ipcMain.handle("create-profile", async (event, { profileName, proxyName }) => {
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

    // Đặt ngôn ngữ tiếng Anh
    fingerprint.navigator.language = "en-US";
    fingerprint.navigator.languages = ["en-US", "en"];

    const profileConfig = {
      name: profileName,
      createdAt: new Date().toISOString(),
      proxyName: proxyName || null,
      fingerprint: fingerprint
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
  const targetUrl = url || "https://whoer.net/";
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

    let playwrightProxyConfig = undefined;
    let finalTimezone = fingerprint.timezoneId;
    let finalLocale = "en-US";
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

    // 🔧 TẠO FINGERPRINTS MỚI HOÀN TOÀN CHO MỖI SESSION
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const webglHash = generateRandomHash();
    const canvasHash = generateRandomHash();
    const audioHash = generateRandomHash();
    
    const sessionFingerprints = {
      canvasHash: canvasHash,
      webglHash: webglHash,
      webglVendor: generateRandomWebGLVendor(),
      webglRenderer: generateRandomWebGLRenderer(),
      webglVersion: "WebGL 1.0 (OpenGL ES 2.0 Chromium)",
      audioHash: audioHash,
      sessionId: sessionId,
      timestamp: Date.now(),
      webglSeed: Math.floor(Math.random() * 1000000),
      audioSeed: Math.floor(Math.random() * 1000000)
    };

    console.log(`🆕 NEW SESSION: ${sessionId}`);
    console.log(`🎯 TARGET WebGL hash: ${webglHash}`);
    console.log(`🎯 TARGET AudioContext hash: ${audioHash}`);

    // Accept-Language header
    const acceptLanguageHeader = "en-US,en;q=0.9";

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

    browserContext = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      proxy: playwrightProxyConfig,
      userAgent: fingerprint.navigator.userAgent,
      locale: finalLocale,
      timezoneId: finalTimezone,
      geolocation: finalGeolocation,
      viewport: {
        width: Math.round(fingerprint.screen.width),
        height: Math.round(fingerprint.screen.height),
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
      ],
      ignoreDefaultArgs: [
        "--enable-automation",
        "--disable-background-timer-throttling",
      ],
      timeout: 60000,
    });

    // ======================================================
    // HÀM BẢO VỆ COMPLETE FINGERPRINT (WEBGL + AUDIO)
    // ======================================================
    const applyCompleteFingerprintProtection = async (
      targetPage,
      sessionFingerprints
    ) => {
      try {
        await targetPage.addInitScript((args) => {
          const { sessionFingerprints } = args;

          console.log("🛡️ Applying COMPLETE fingerprint protection...");

          // === WEBGL HASH PROTECTION - CAN THIỆP SÂU ===
          if (typeof WebGLRenderingContext !== "undefined") {
            const WebGL = WebGLRenderingContext;
            
            // 1. GHI ĐÈ GETPARAMETER - TRẢ VỀ GIÁ TRỊ FAKE
            const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function (parameter) {
              // Tạo mapping HOÀN TOÀN NGẪU NHIÊN cho mỗi session
              const randomBase = sessionFingerprints.webglSeed;
              
              const parameterMap = {
                // Core WebGL parameters
                [WebGL.VENDOR]: sessionFingerprints.webglVendor,
                [WebGL.RENDERER]: sessionFingerprints.webglRenderer,
                [WebGL.VERSION]: sessionFingerprints.webglVersion,
                
                // Unmasked parameters - QUAN TRỌNG
                37445: sessionFingerprints.webglVendor,
                37446: sessionFingerprints.webglRenderer,
                
                // Hardware limits - NGẪU NHIÊN HOÀN TOÀN
                [WebGL.MAX_TEXTURE_SIZE]: 4096 + (randomBase % 8192),
                [WebGL.MAX_RENDERBUFFER_SIZE]: 4096 + (randomBase % 8192),
                [WebGL.MAX_VIEWPORT_DIMS]: [8192 + (randomBase % 8192), 8192 + (randomBase % 8192)],
                [WebGL.MAX_CUBE_MAP_TEXTURE_SIZE]: 4096 + (randomBase % 4096),
                [WebGL.MAX_VERTEX_TEXTURE_IMAGE_UNITS]: 8 + (randomBase % 24),
                [WebGL.MAX_TEXTURE_IMAGE_UNITS]: 8 + (randomBase % 24),
                [WebGL.MAX_VERTEX_ATTRIBS]: 8 + (randomBase % 8),
                [WebGL.MAX_VERTEX_UNIFORM_VECTORS]: 128 + (randomBase % 896),
                [WebGL.MAX_FRAGMENT_UNIFORM_VECTORS]: 64 + (randomBase % 960),
                
                // Các parameters khác
                [WebGL.ALIASED_LINE_WIDTH_RANGE]: new Float32Array([1, 10 + (randomBase % 5)]),
                [WebGL.ALIASED_POINT_SIZE_RANGE]: new Float32Array([1, 2048 + (randomBase % 100)]),
                [WebGL.MAX_COMBINED_TEXTURE_IMAGE_UNITS]: 8 + (randomBase % 24),
              };

              if (parameterMap[parameter] !== undefined) {
                return parameterMap[parameter];
              }

              try {
                const result = originalGetParameter.call(this, parameter);
                
                // THÊM BIẾN THỂ NGẪU NHIÊN CHO TẤT CẢ KẾT QUẢ
                if (typeof result === 'number') {
                  const variant = (randomBase + parameter) % 1000;
                  return result + (variant * 0.000001);
                }
                
                return result;
              } catch (e) {
                return null;
              }
            };

            // 2. GHI ĐÈ READPIXELS - THÊM NOISE VÀO PIXEL DATA
            const originalReadPixels = WebGLRenderingContext.prototype.readPixels;
            WebGLRenderingContext.prototype.readPixels = function (x, y, width, height, format, type, pixels) {
              const result = originalReadPixels.call(this, x, y, width, height, format, type, pixels);
              
              if (pixels && pixels.length > 0) {
                const targetHash = sessionFingerprints.webglHash;
                let hashSum = 0;
                for (let i = 0; i < targetHash.length; i++) {
                  hashSum += targetHash.charCodeAt(i);
                }
                
                // Áp dụng noise pattern PHỨC TẠP
                for (let i = 0; i < pixels.length; i += 4) {
                  const pixelIndex = i / 4;
                  const xPos = pixelIndex % width;
                  const yPos = Math.floor(pixelIndex / width);
                  
                  // Tạo noise độc nhất cho mỗi pixel
                  const positionFactor = (xPos * 7 + yPos * 13) % 17;
                  const hashFactor = (hashSum + i) % 11;
                  const timeFactor = (sessionFingerprints.timestamp + i) % 7;
                  
                  const finalNoise = (positionFactor + hashFactor + timeFactor) % 5;
                  
                  pixels[i] = (pixels[i] + finalNoise) % 256;         // Red
                  pixels[i + 1] = (pixels[i + 1] + finalNoise) % 256; // Green
                  pixels[i + 2] = (pixels[i + 2] + finalNoise) % 256; // Blue
                }
              }
              
              return result;
            };

            // 3. GHI ĐÈ GETSHADERPRECISIONFORMAT
            const originalGetShaderPrecisionFormat = WebGLRenderingContext.prototype.getShaderPrecisionFormat;
            WebGLRenderingContext.prototype.getShaderPrecisionFormat = function (shaderType, precisionType) {
              const format = originalGetShaderPrecisionFormat.call(this, shaderType, precisionType);
              if (format) {
                // Thay đổi precision để tạo hash khác
                const randomVariant = sessionFingerprints.webglSeed % 5;
                return {
                  rangeMin: format.rangeMin,
                  rangeMax: format.rangeMax + randomVariant,
                  precision: format.precision + (randomVariant % 2)
                };
              }
              return format;
            };

            // 4. GHI ĐÈ GETSUPPORTEDEXTENSIONS
            const originalGetSupportedExtensions = WebGLRenderingContext.prototype.getSupportedExtensions;
            WebGLRenderingContext.prototype.getSupportedExtensions = function () {
              const original = originalGetSupportedExtensions.call(this) || [];
              
              // Tạo extensions list độc nhất
              const modifiedExtensions = [...original];
              
              // Loại bỏ extensions debug
              const debugExtensions = ['WEBGL_debug_renderer_info', 'WEBGL_debug_shaders', 'WEBGL_lose_context'];
              debugExtensions.forEach(ext => {
                const index = modifiedExtensions.indexOf(ext);
                if (index > -1) {
                  modifiedExtensions.splice(index, 1);
                }
              });
              
              // Thêm extensions ngẫu nhiên
              const possibleExtensions = [
                'WEBGL_compressed_texture_etc',
                'WEBGL_compressed_texture_astc', 
                'WEBGL_compressed_texture_s3tc',
                'WEBGL_depth_texture',
                'WEBGL_draw_buffers',
                'OES_texture_float',
                'OES_texture_half_float',
                'OES_standard_derivatives',
                'EXT_texture_filter_anisotropic'
              ];
              
              possibleExtensions.forEach(ext => {
                const shouldAdd = (sessionFingerprints.webglSeed + ext.length) % 3 === 0;
                if (shouldAdd && !modifiedExtensions.includes(ext)) {
                  modifiedExtensions.push(ext);
                }
              });
              
              return modifiedExtensions.sort(); // Sắp xếp để tạo hash khác
            };

            console.log("✅ WebGL HASH protection applied");
          }

          // === AUDIOCONTEXT HASH PROTECTION ===
          if (window.OfflineAudioContext) {
            const OriginalOfflineAudioContext = window.OfflineAudioContext;
            
            window.OfflineAudioContext = function(numberOfChannels, length, sampleRate) {
              console.log("🎵 Creating protected OfflineAudioContext");
              
              // Thay đổi các tham số để tạo hash khác
              const modifiedSampleRate = sampleRate + (sessionFingerprints.audioSeed % 100);
              const modifiedLength = length + (sessionFingerprints.audioSeed % 512);
              
              const context = new OriginalOfflineAudioContext(
                numberOfChannels, 
                modifiedLength, 
                modifiedSampleRate
              );
              
              // Ghi đè createAnalyser
              const originalCreateAnalyser = context.createAnalyser;
              context.createAnalyser = function() {
                const analyser = originalCreateAnalyser.call(this);
                
                // Fake frequencyBinCount
                const fakeFreqBin = 1024 + (sessionFingerprints.audioSeed % 256);
                Object.defineProperty(analyser, 'frequencyBinCount', {
                  get: function() {
                    return fakeFreqBin;
                  },
                  configurable: false
                });
                
                // Ghi đè getByteFrequencyData
                const originalGetByteFrequencyData = analyser.getByteFrequencyData;
                analyser.getByteFrequencyData = function(array) {
                  const result = originalGetByteFrequencyData.call(this, array);
                  
                  if (array && array.length > 0) {
                    const audioHash = sessionFingerprints.audioHash;
                    let hashSum = 0;
                    for (let i = 0; i < audioHash.length; i++) {
                      hashSum += audioHash.charCodeAt(i);
                    }
                    
                    for (let i = 0; i < array.length; i++) {
                      const positionFactor = (i * hashSum) % 127;
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

          // AudioContext protection
          if (window.AudioContext || window.webkitAudioContext) {
            const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
            
            window.AudioContext = function(contextOptions) {
              const audioContext = new OriginalAudioContext(contextOptions);
              
              // Fake currentTime
              const timeOffset = (sessionFingerprints.audioSeed % 10000) / 100000;
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

              // Fake sampleRate
              const originalSampleRate = audioContext.sampleRate;
              Object.defineProperty(audioContext, 'sampleRate', {
                get: function() {
                  return originalSampleRate + (sessionFingerprints.audioSeed % 50);
                },
                configurable: false
              });

              return audioContext;
            };
            
            window.AudioContext.prototype = OriginalAudioContext.prototype;
            if (window.webkitAudioContext) {
              window.webkitAudioContext = window.AudioContext;
            }

            console.log("✅ AudioContext HASH protection applied");
          }

          // === CANVAS PROTECTION ===
          const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
          CanvasRenderingContext2D.prototype.getImageData = function (...args) {
            const imageData = originalGetImageData.apply(this, args);
            
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
              if (i % 20 === 0) {
                const noise = (i + sessionFingerprints.timestamp) % 4;
                data[i] = (data[i] + noise) % 256;
                data[i + 1] = (data[i + 1] + noise) % 256;
                data[i + 2] = (data[i + 2] + noise) % 256;
              }
            }
            return imageData;
          };

          console.log("✅ ALL fingerprint protections applied successfully");

        }, { sessionFingerprints });

        console.log("🎯 COMPLETE fingerprint protection injection DONE");

      } catch (error) {
        console.error("❌ Error applying fingerprint protection:", error);
      }
    };

    // ======================================================
    // ÁP DỤNG BẢO VỆ
    // ======================================================
    let page;
    try {
      await browserContext.waitForEvent("page");
      page = browserContext.pages()[0];

      await applyCompleteFingerprintProtection(page, sessionFingerprints);
      console.log(`✅ Applied COMPLETE fingerprint protection to initial page`);
    } catch (error) {
      console.error("❌ Error setting up initial page:", error);
      page = await browserContext.newPage();
    }

    browserContext.on("page", async (newPage) => {
      console.log(`🔄 New page detected, applying fingerprint protection...`);

      try {
        await applyCompleteFingerprintProtection(newPage, sessionFingerprints);
        console.log(`✅ Applied fingerprint protection to new page`);
      } catch (error) {
        console.error(`❌ Failed to apply protection to new page:`, error);
      }
    });

    // Cleanup khi browser đóng
    browserContext.on("close", () => {
      console.log(`🔚 Browser closed - NEXT SESSION will have NEW fingerprints`);
    });

    // Chuyển đến URL đích
    if (page) {
      await page.goto(targetUrl);
      console.log(`🌐 Navigated to: ${targetUrl}`);
    }

    return { 
      success: true, 
      message: `Browser for '${profileName}' opened with NEW fingerprints.`,
      fingerprints: {
        webglHash: webglHash,
        audioHash: audioHash,
        sessionId: sessionId
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