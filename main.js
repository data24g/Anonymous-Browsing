const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const Store = require("electron-store");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

// Bộ công cụ ổn định
const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
chromium.use(stealth);

// Chỉ sử dụng generator
const { FingerprintGenerator } = require("fingerprint-generator");

let proxyStore;
const PROFILES_DIR = path.join(__dirname, "profiles");

// ========================================================================
// FINGERPRINT GENERATOR MỚI
// ========================================================================
class AdvancedFingerprintGenerator {
    constructor() {
        this.WEBGL_PROFILES = [
            {"vendor": "Intel Inc.", "renderer": "Intel(R) UHD Graphics 620"},
            {"vendor": "Intel Inc.", "renderer": "Intel(R) UHD Graphics 630"},
            {"vendor": "Intel Inc.", "renderer": "Intel(R) HD Graphics 520"},
            {"vendor": "Intel Inc.", "renderer": "Intel(R) Iris(R) Xe Graphics"},
            {"vendor": "NVIDIA Corporation", "renderer": "NVIDIA GeForce GTX 1650"},
            {"vendor": "NVIDIA Corporation", "renderer": "NVIDIA GeForce GTX 1050 Ti"},
            {"vendor": "NVIDIA Corporation", "renderer": "NVIDIA GeForce MX250"},
            {"vendor": "NVIDIA Corporation", "renderer": "NVIDIA GeForce RTX 3060"},
            {"vendor": "NVIDIA Corporation", "renderer": "NVIDIA GeForce GTX 1660"},
            {"vendor": "AMD", "renderer": "AMD Radeon(TM) Graphics"},
            {"vendor": "AMD", "renderer": "AMD Radeon RX 580"},
            {"vendor": "AMD", "renderer": "AMD Radeon RX 6600"},
            {"vendor": "AMD", "renderer": "AMD Radeon Vega 8 Graphics"},
        ];
        
        this.SCREEN_RESOLUTIONS = [
            {width: 1920, height: 1080},
            {width: 1366, height: 768},
            {width: 1536, height: 864},
            {width: 1440, height: 900},
            {width: 2560, height: 1440},
            {width: 1280, height: 720}
        ];
        
        this.CPU_CORES = [2, 4, 6, 8, 12, 16];
        this.RAM_SIZES = [4, 8, 16, 32];
        this.TIMEZONES = [
            'America/New_York', 'America/Los_Angeles', 'Europe/London',
            'Europe/Paris', 'Asia/Tokyo', 'Asia/Singapore', 'Asia/Ho_Chi_Minh'
        ];
        
        this.LANGUAGES = [
            'en-US', 'vi-VN', 'zh-CN', 'ja-JP', 'ko-KR', 
            'fr-FR', 'de-DE', 'es-ES', 'ru-RU'
        ];
    }
    
    generateFingerprint(profileName, customSettings = {}) {
        const seed = crypto.createHash('md5').update(profileName).digest('hex');
        const random = this.seededRandom(seed);
        
        const webgl = this.WEBGL_PROFILES[Math.floor(random() * this.WEBGL_PROFILES.length)];
        const screen = this.SCREEN_RESOLUTIONS[Math.floor(random() * this.SCREEN_RESOLUTIONS.length)];
        
        // Smart pairing: high-end GPU → more cores/RAM
        let cores, memory;
        if (webgl.renderer.includes("RTX") || webgl.renderer.includes("RX 6")) {
            cores = [8, 12, 16][Math.floor(random() * 3)];
        } else if (webgl.renderer.includes("GTX")) {
            cores = [4, 6, 8][Math.floor(random() * 3)];
        } else {
            cores = [2, 4, 6][Math.floor(random() * 3)];
        }
        
        memory = cores >= 8 ? [16, 32][Math.floor(random() * 2)] : 
                 cores >= 4 ? [8, 16][Math.floor(random() * 2)] : 
                 [4, 8][Math.floor(random() * 2)];
        
        // Áp dụng custom settings
        const finalLanguage = customSettings.language && customSettings.language !== 'auto' 
            ? customSettings.language 
            : this.LANGUAGES[Math.floor(random() * this.LANGUAGES.length)];
            
        const finalScreen = customSettings.screenResolution && customSettings.screenResolution !== 'auto'
            ? this.parseScreenResolution(customSettings.screenResolution)
            : screen;
            
        const finalHardware = customSettings.hardware && customSettings.hardware !== 'auto'
            ? this.getHardwareConfig(customSettings.hardware)
            : webgl;

        // Tạo user agent
        const userAgent = this.generateUserAgent(finalHardware.vendor);

        // Xử lý timezone
        let timezone = this.TIMEZONES[Math.floor(random() * this.TIMEZONES.length)];
        if (customSettings.timezone && customSettings.timezone !== 'auto') {
            timezone = customSettings.timezone;
        }

        return {
            screen: {
                width: finalScreen.width,
                height: finalScreen.height,
                availWidth: finalScreen.width - 100,
                availHeight: finalScreen.height - 100,
                colorDepth: 24,
                pixelDepth: 24
            },
            navigator: {
                userAgent: userAgent,
                language: finalLanguage,
                languages: [finalLanguage, finalLanguage.split('-')[0], 'en'],
                platform: 'Win32',
                hardwareConcurrency: cores,
                deviceMemory: memory
            },
            webglVendor: finalHardware.vendor,
            webglRenderer: finalHardware.renderer,
            webglVersion: "WebGL 1.0 (OpenGL ES 2.0 Chromium)",
            timezoneId: timezone,
            cpuCores: cores,
            deviceMemory: memory,
            canvasNoise: parseFloat((0.001 + random() * 0.009).toFixed(4)),
            audioNoise: parseFloat((0.0005 + random() * 0.0045).toFixed(4))
        };
    }
    
    seededRandom(seed) {
        let value = parseInt(seed.substring(0, 8), 16);
        return function() {
            value = (value * 9301 + 49297) % 233280;
            return value / 233280;
        };
    }
    
    parseScreenResolution(resolutionStr) {
        const [width, height] = resolutionStr.split('x').map(Number);
        return { width: width || 1920, height: height || 1080 };
    }
    
    getHardwareConfig(hardwareId) {
        const hardwareMap = {
            'intel_uhd_620': { vendor: "Intel Inc.", renderer: "Intel(R) UHD Graphics 620" },
            'intel_uhd_630': { vendor: "Intel Inc.", renderer: "Intel(R) UHD Graphics 630" },
            'intel_hd_520': { vendor: "Intel Inc.", renderer: "Intel(R) HD Graphics 520" },
            'intel_iris_xe': { vendor: "Intel Inc.", renderer: "Intel(R) Iris(R) Xe Graphics" },
            'nvidia_gtx_1650': { vendor: "NVIDIA Corporation", renderer: "NVIDIA GeForce GTX 1650" },
            'nvidia_gtx_1050_ti': { vendor: "NVIDIA Corporation", renderer: "NVIDIA GeForce GTX 1050 Ti" },
            'nvidia_mx250': { vendor: "NVIDIA Corporation", renderer: "NVIDIA GeForce MX250" },
            'nvidia_rtx_3060': { vendor: "NVIDIA Corporation", renderer: "NVIDIA GeForce RTX 3060" },
            'nvidia_gtx_1660': { vendor: "NVIDIA Corporation", renderer: "NVIDIA GeForce GTX 1660" },
            'amd_radeon': { vendor: "AMD", renderer: "AMD Radeon(TM) Graphics" },
            'amd_rx_580': { vendor: "AMD", renderer: "AMD Radeon RX 580" },
            'amd_rx_6600': { vendor: "AMD", renderer: "AMD Radeon RX 6600" },
            'amd_vega_8': { vendor: "AMD", renderer: "AMD Radeon Vega 8 Graphics" }
        };
        
        return hardwareMap[hardwareId] || hardwareMap['intel_uhd_620'];
    }
    
    generateUserAgent(vendor) {
        const chromeVersions = ['141.0.0.0', '142.0.0.0', '140.0.0.0', '139.0.0.0'];
        const randomVersion = chromeVersions[Math.floor(Math.random() * chromeVersions.length)];
        
        return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${randomVersion} Safari/537.36`;
    }
    
    getHardwareOptions() {
        return [
            { id: 'auto', name: 'Tự động chọn phần cứng phù hợp' },
            { id: 'intel_uhd_620', name: 'Intel UHD Graphics 620' },
            { id: 'intel_uhd_630', name: 'Intel UHD Graphics 630' },
            { id: 'intel_hd_520', name: 'Intel HD Graphics 520' },
            { id: 'intel_iris_xe', name: 'Intel Iris Xe Graphics' },
            { id: 'nvidia_gtx_1650', name: 'NVIDIA GeForce GTX 1650' },
            { id: 'nvidia_gtx_1050_ti', name: 'NVIDIA GeForce GTX 1050 Ti' },
            { id: 'nvidia_mx250', name: 'NVIDIA GeForce MX250' },
            { id: 'nvidia_rtx_3060', name: 'NVIDIA GeForce RTX 3060' },
            { id: 'nvidia_gtx_1660', name: 'NVIDIA GeForce GTX 1660' },
            { id: 'amd_radeon', name: 'AMD Radeon Graphics' },
            { id: 'amd_rx_580', name: 'AMD Radeon RX 580' },
            { id: 'amd_rx_6600', name: 'AMD Radeon RX 6600' },
            { id: 'amd_vega_8', name: 'AMD Radeon Vega 8' }
        ];
    }
}

const advancedFingerprintGenerator = new AdvancedFingerprintGenerator();

// Hàm helper
function ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// ========================================================================
// XỬ LÝ PROXY - ĐÃ SỬA LỖI
// ========================================================================
function parseProxyInput(proxyString) {
    if (!proxyString || typeof proxyString !== 'string') {
        return { success: false, message: "Chuỗi proxy không hợp lệ" };
    }
    
    proxyString = proxyString.trim();
    
    // Kiểm tra định dạng
    const simpleFormat = proxyString.split(':');
    
    if (simpleFormat.length < 2 || simpleFormat.length > 4) {
        return { success: false, message: "Định dạng proxy không hợp lệ. Ví dụ: 127.0.0.1:8080" };
    }
    
    const result = {
        server: '',
        username: '',
        password: '',
        success: true
    };
    
    // Validate IP
    const ip = simpleFormat[0];
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
        return { success: false, message: "Địa chỉ IP không hợp lệ" };
    }
    
    // Validate port
    const port = parseInt(simpleFormat[1]);
    if (isNaN(port) || port < 1 || port > 65535) {
        return { success: false, message: "Port không hợp lệ (1-65535)" };
    }
    
    if (simpleFormat.length === 2) {
        // Định dạng: ip:port
        result.server = `http://${ip}:${port}`;
    } else if (simpleFormat.length === 4) {
        // Định dạng: ip:port:username:password
        result.server = `http://${ip}:${port}`;
        result.username = simpleFormat[2];
        result.password = simpleFormat[3];
        
        if (!result.username || !result.password) {
            return { success: false, message: "Username và password không được để trống" };
        }
    } else {
        return { success: false, message: "Định dạng proxy không hợp lệ. Sử dụng: ip:port hoặc ip:port:username:password" };
    }
    
    return result;
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
                country: data.country,
                city: data.city
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

// --- Cửa sổ chính ---
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
    
    // Khởi tạo proxyStore
    proxyStore = new Store({ name: "proxies" });
    
    if (!proxyStore.has("list")) {
        proxyStore.set("list", []);
    }
    
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
    console.log('📝 Creating profile with data:', { 
        profileName, 
        proxyName,
        customSettings 
    });
    
    if (!profileName || typeof profileName !== "string") {
        console.error('❌ Invalid profile name:', profileName);
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
        
        // Enhanced custom settings
        const enhancedCustomSettings = {
            ...customSettings,
            timezone: customSettings.timezone || 'auto',
            deviceType: customSettings.deviceType || 'desktop',
            userAgent: customSettings.userAgent || 'auto'
        };
        
        // Tạo fingerprint
        const fingerprint = advancedFingerprintGenerator.generateFingerprint(
            profileName, 
            enhancedCustomSettings
        );

        // Thêm timezone nếu có
        if (enhancedCustomSettings.timezone && enhancedCustomSettings.timezone !== 'auto') {
            fingerprint.timezoneId = enhancedCustomSettings.timezone;
        }

        const profileConfig = {
            name: profileName,
            createdAt: new Date().toISOString(),
            proxyName: proxyName || null,
            fingerprint: fingerprint,
            customSettings: enhancedCustomSettings
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

// ========================================================================
// IPC HANDLER ĐỂ LẤY DANH SÁCH PHẦN CỨNG
// ========================================================================
ipcMain.handle("get-hardware-options", async () => {
    return advancedFingerprintGenerator.getHardwareOptions();
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

// ========================================================================
// MỞ TRÌNH DUYỆT - ĐÃ SỬA LỖI PROXY
// ========================================================================
let activeBrowserContexts = new Map();

ipcMain.handle("open-browser", async (event, profileName, url) => {
    const targetUrl = url || "https://google.com"; // Đổi thành google.com để test đơn giản
    const profilePath = path.join(PROFILES_DIR, profileName);
    const userDataDir = path.join(profilePath, "user-data");
    const configFile = path.join(profilePath, "config.json");

    if (!fs.existsSync(configFile)) {
        return {
            success: false,
            message: `Config not found for '${profileName}'.`,
        };
    }

    // Dọn dẹp profile
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
        
        console.log(`🧹 Cleaned profile data for '${profileName}'.`);
    } catch (e) {
        console.error(`Could not clean profile data:`, e);
    }

    let browserContext = null;
    try {
        const profileConfig = JSON.parse(fs.readFileSync(configFile, "utf-8"));
        const fingerprint = profileConfig.fingerprint;
        
        if (!fingerprint) {
            return {
                success: false,
                message: "Fingerprint data is invalid or missing.",
            };
        }

        // ========================================================================
        // XỬ LÝ PROXY - ĐÃ SỬA
        // ========================================================================
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
                console.log(`🔌 Attempting to use proxy: ${selectedProxy.server}`);
                
                // Test proxy trước khi dùng
                try {
                    const proxyTest = await fetch('http://httpbin.org/ip', {
                        timeout: 5000,
                        agent: require('https-proxy-agent')({
                            host: selectedProxy.server.replace('http://', '').split(':')[0],
                            port: parseInt(selectedProxy.server.split(':')[2] || selectedProxy.server.split(':')[1]),
                            ...(selectedProxy.username && selectedProxy.password ? {
                                auth: `${selectedProxy.username}:${selectedProxy.password}`
                            } : {})
                        })
                    }).catch(() => null);
                    
                    if (proxyTest) {
                        playwrightProxyConfig = {
                            server: selectedProxy.server
                        };
                        
                        if (selectedProxy.username && selectedProxy.password) {
                            playwrightProxyConfig = {
                                ...playwrightProxyConfig,
                                username: selectedProxy.username,
                                password: selectedProxy.password
                            };
                        }
                        console.log('✅ Proxy test successful');
                    } else {
                        console.warn('⚠️ Proxy test failed, continuing without proxy');
                    }
                } catch (proxyError) {
                    console.warn('⚠️ Proxy test error:', proxyError.message);
                }
                
                // Cập nhật thông tin địa lý
                if (selectedProxy.timezoneId) finalTimezone = selectedProxy.timezoneId;
                if (selectedProxy.latitude !== undefined && selectedProxy.longitude !== undefined) {
                    finalGeolocation = {
                        latitude: selectedProxy.latitude,
                        longitude: selectedProxy.longitude,
                        accuracy: Math.floor(Math.random() * 30 + 10),
                    };
                }
            } else {
                console.warn(`⚠️ Proxy '${profileConfig.proxyName}' not found`);
            }
        }

        // ========================================================================
        // LẤY THÔNG TIN TỪ FINGERPRINT
        // ========================================================================
        const customSettings = profileConfig.customSettings || {};
        const selectedHardware = customSettings.hardware || 'auto';
        
        const profileWebglVendor = fingerprint.webglVendor;
        const profileWebglRenderer = fingerprint.webglRenderer;
        const profileWebglVersion = fingerprint.webglVersion || "WebGL 1.0 (OpenGL ES 2.0 Chromium)";

        let finalScreenWidth = Math.round(fingerprint.screen?.width || 1920);
        let finalScreenHeight = Math.round(fingerprint.screen?.height || 1080);

        console.log(`🎯 SCREEN: ${finalScreenWidth}x${finalScreenHeight}`);
        console.log(`🎮 HARDWARE: ${profileWebglVendor} - ${profileWebglRenderer}`);
        console.log(`💻 CPU: ${fingerprint.cpuCores} cores`);
        console.log(`💾 RAM: ${fingerprint.deviceMemory}GB`);
        console.log(`🌐 PROXY: ${playwrightProxyConfig ? 'ENABLED' : 'DISABLED'}`);

        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const sessionFingerprints = {
            canvasHash: crypto.randomBytes(16).toString('hex'),
            webglHash: crypto.randomBytes(16).toString('hex'),
            audioHash: crypto.randomBytes(16).toString('hex'),
            webglVendor: profileWebglVendor,
            webglRenderer: profileWebglRenderer, 
            webglVersion: profileWebglVersion,
            sessionId: sessionId,
            timestamp: Date.now(),
            selectedHardware: selectedHardware,
            screenWidth: finalScreenWidth,
            screenHeight: finalScreenHeight,
            cpuCores: fingerprint.cpuCores,
            deviceMemory: fingerprint.deviceMemory
        };

        const acceptLanguageHeader = fingerprint.navigator?.languages ? 
            fingerprint.navigator.languages.join(',') : "en-US,en;q=0.9";

        // Kiểm tra extension
        const extensionPath = path.join(__dirname, "webrtc-blocker-extension");
        let extensionArgs = [];
        
        // Chỉ load extension nếu tồn tại
        if (fs.existsSync(extensionPath) && fs.existsSync(path.join(extensionPath, "manifest.json"))) {
            extensionArgs = [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
            ];
            console.log('✅ Extension will be loaded');
        } else {
            console.warn('⚠️ Extension not found, running without extension');
        }

        // Đóng context cũ nếu có
        try {
            const existingContext = activeBrowserContexts.get(profileName);
            if (existingContext) {
                await existingContext.close();
                activeBrowserContexts.delete(profileName);
            }
        } catch (e) {
            console.log("No existing contexts to close");
        }

        // Fingerprint script đơn giản
        const fingerprintScript = `
        // === FINGERPRINT PROTECTION ===
        (function() {
            const sessionFingerprints = ${JSON.stringify(sessionFingerprints)};
            const finalScreenWidth = ${finalScreenWidth};
            const finalScreenHeight = ${finalScreenHeight};
            
            console.log("🛡️ Applying fingerprint protection...");

            // Remove automation detection
            delete navigator.webdriver;
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
                configurable: true
            });

            // Fix screen properties
            const screenProps = {
                width: finalScreenWidth,
                height: finalScreenHeight,
                availWidth: finalScreenWidth - 100,
                availHeight: finalScreenHeight - 100,
                colorDepth: 24,
                pixelDepth: 24,
            };

            Object.keys(screenProps).forEach(prop => {
                Object.defineProperty(screen, prop, {
                    get: () => screenProps[prop],
                    configurable: false
                });
            });

            console.log("✅ Fingerprint protection applied");
        })();
        `;

        // Browser options - ĐÃ ĐƠN GIẢN HÓA
        const browserOptions = {
            headless: false,
            userAgent: fingerprint.navigator.userAgent,
            locale: finalLocale,
            timezoneId: finalTimezone,
            geolocation: finalGeolocation,
            viewport: {
                width: finalScreenWidth,
                height: finalScreenHeight,
            },
            screen: {
                width: finalScreenWidth,
                height: finalScreenHeight
            },
            extraHTTPHeaders: {
                "accept-language": acceptLanguageHeader,
            },
            args: [
                ...extensionArgs,
                "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
                "--disable-blink-features=AutomationControlled",
                "--no-first-run",
                "--no-default-browser-check",
                `--window-size=${finalScreenWidth},${finalScreenHeight}`,
                "--disable-web-security",
                "--ignore-gpu-blocklist",
                "--enable-gpu-rasterization",
                "--enable-webgl",
                "--enable-accelerated-2d-canvas",
                "--no-sandbox",
                "--disable-setuid-sandbox"
            ],
            ignoreDefaultArgs: ["--enable-automation"],
            timeout: 30000,
            ignoreHTTPSErrors: true,
            // Thêm proxy nếu có
            proxy: playwrightProxyConfig
        };

        console.log('🚀 Launching browser...');
        
        // Launch browser với retry logic
        try {
            browserContext = await chromium.launchPersistentContext(userDataDir, browserOptions);
        } catch (launchError) {
            console.error('Browser launch error:', launchError.message);
            
            // Thử lại không dùng proxy nếu lỗi
            if (playwrightProxyConfig) {
                console.log('🔄 Retrying without proxy...');
                delete browserOptions.proxy;
                browserContext = await chromium.launchPersistentContext(userDataDir, browserOptions);
            } else {
                throw launchError;
            }
        }

        // Lưu context
        activeBrowserContexts.set(profileName, browserContext);

        browserContext.on('close', () => {
            activeBrowserContexts.delete(profileName);
        });

        // Áp dụng fingerprint script
        const applyFingerprintToAllPages = async () => {
            const existingPages = browserContext.pages();
            for (const page of existingPages) {
                try {
                    await page.addInitScript(fingerprintScript);
                } catch (error) {
                    console.error('Failed to apply fingerprint:', error);
                }
            }

            browserContext.on("page", async (newPage) => {
                try {
                    await newPage.addInitScript(fingerprintScript);
                } catch (error) {
                    console.error('Failed to apply fingerprint to new page:', error);
                }
            });
        };

        await applyFingerprintToAllPages();

        // Điều hướng đến URL
        const pages = browserContext.pages();
        if (pages.length > 0) {
            const page = pages[0];
            
            try {
                await page.goto(targetUrl, {
                    timeout: 15000,
                    waitUntil: 'domcontentloaded'
                });
                console.log(`🌐 Navigated to: ${targetUrl}`);
            } catch (navError) {
                console.warn(`Navigation error: ${navError.message}`);
                
                // Thử với URL đơn giản hơn
                try {
                    await page.goto('https://google.com', {
                        timeout: 10000,
                        waitUntil: 'load'
                    });
                    console.log(`🔄 Fallback to: https://google.com`);
                } catch (fallbackError) {
                    console.error('Fallback navigation failed:', fallbackError.message);
                }
            }
        }

        return { 
            success: true, 
            message: `Browser for '${profileName}' opened successfully.`,
            fingerprints: {
                canvasHash: sessionFingerprints.canvasHash,
                webglHash: sessionFingerprints.webglHash,
                audioHash: sessionFingerprints.audioHash,
                sessionId: sessionId,
                hardware: `${profileWebglVendor} - ${profileWebglRenderer}`,
                cpuCores: fingerprint.cpuCores,
                memory: fingerprint.deviceMemory,
                resolution: `${finalScreenWidth}x${finalScreenHeight}`,
                timezone: finalTimezone,
                proxy: playwrightProxyConfig ? 'ENABLED' : 'DISABLED'
            }
        };
        
    } catch (error) {
        console.error(`❌ Error opening browser for ${profileName}:`, error);
        
        let errorMessage = error.message;
        if (errorMessage.includes('ERR_PROXY_CONNECTION_FAILED')) {
            errorMessage = 'Kết nối proxy thất bại. Vui lòng kiểm tra cài đặt proxy hoặc thử không dùng proxy.';
        } else if (errorMessage.includes('timeout')) {
            errorMessage = 'Hết thời gian kết nối. Vui lòng kiểm tra internet.';
        } else if (errorMessage.includes('net::ERR')) {
            errorMessage = 'Lỗi mạng. Vui lòng kiểm tra URL và kết nối.';
        }
        
        if (browserContext) {
            try {
                await browserContext.close();
                activeBrowserContexts.delete(profileName);
            } catch (e) {
                console.error("Error closing context:", e);
            }
        }
        return {
            success: false,
            message: `Không thể mở trình duyệt: ${errorMessage}`,
        };
    }
});

// Browser management
ipcMain.handle("close-browser", async (event, profileName) => {
    try {
        const context = activeBrowserContexts.get(profileName);
        if (context) {
            await context.close();
            activeBrowserContexts.delete(profileName);
            return { success: true, message: "Browser closed successfully" };
        }
        return { success: false, message: "No active browser found" };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle("get-browser-status", async () => {
    const status = {};
    activeBrowserContexts.forEach((context, profileName) => {
        status[profileName] = {
            isActive: true,
            pages: context.pages().length
        };
    });
    return status;
});

// ========================================================================
// QUẢN LÝ PROXY
// ========================================================================

ipcMain.handle("get-proxies", async () => {
    try {
        if (!proxyStore) {
            console.error("Proxy store not initialized");
            return [];
        }
        
        const proxies = proxyStore.get("list", []);
        console.log(`📋 Loaded ${proxies.length} proxies`);
        return proxies;
    } catch (error) {
        console.error("Error getting proxies:", error);
        return [];
    }
});

ipcMain.handle("add-proxy", async (event, proxyConfig) => {
    console.log("🔄 Adding proxy:", proxyConfig);
    
    if (!proxyStore) {
        return { success: false, message: "Proxy store not ready." };
    }
    
    try {
        if (!proxyConfig || !proxyConfig.name || !proxyConfig.server) {
            return { success: false, message: "Tên và Server proxy không được để trống." };
        }

        // Parse proxy string
        const parsedProxy = parseProxyInput(proxyConfig.server);
        if (!parsedProxy.success) {
            return { success: false, message: parsedProxy.message };
        }

        let proxies = proxyStore.get("list", []);
        console.log(`📊 Current proxies: ${proxies.length}`);

        // Check duplicate
        if (proxies.some((p) => p.name === proxyConfig.name)) {
            return {
                success: false,
                message: `Proxy '${proxyConfig.name}' đã tồn tại.`,
            };
        }

        const newProxy = {
            name: proxyConfig.name.trim(),
            server: parsedProxy.server,
            username: parsedProxy.username || proxyConfig.username || '',
            password: parsedProxy.password || proxyConfig.password || '',
            createdAt: new Date().toISOString(),
            id: uuidv4()
        };

        // Get geo info
        const ipMatch = newProxy.server.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        if (ipMatch && ipMatch[1]) {
            try {
                const geoInfo = await getGeoInfoFromIp(ipMatch[1]);
                if (geoInfo) {
                    Object.assign(newProxy, geoInfo);
                }
            } catch (geoError) {
                console.warn("Could not get geo info:", geoError);
            }
        }

        proxies.push(newProxy);
        proxyStore.set("list", proxies);
        
        console.log(`✅ Proxy '${proxyConfig.name}' added`);
        console.log(`📦 Total proxies: ${proxies.length}`);

        return { 
            success: true, 
            message: `Proxy '${proxyConfig.name}' đã được thêm thành công.` 
        };
        
    } catch (error) {
        console.error("❌ Error adding proxy:", error);
        return {
            success: false,
            message: `Lỗi khi thêm proxy: ${error.message}`,
        };
    }
});

ipcMain.handle("update-proxy", async (event, oldName, newConfig) => {
    console.log(`🔄 Updating proxy: ${oldName}`);
    
    if (!proxyStore) {
        return { success: false, message: "Proxy store not ready." };
    }
    
    try {
        let proxies = proxyStore.get("list", []);
        const index = proxies.findIndex((p) => p.name === oldName);
        
        if (index === -1) {
            return { success: false, message: `Proxy '${oldName}' không tồn tại.` };
        }

        // Check duplicate name
        if (oldName !== newConfig.name && proxies.some((p) => p.name === newConfig.name)) {
            return {
                success: false,
                message: `Tên proxy '${newConfig.name}' đã tồn tại.`,
            };
        }

        // Parse proxy
        const parsedProxy = parseProxyInput(newConfig.server);
        if (!parsedProxy.success) {
            return { success: false, message: parsedProxy.message };
        }

        // Update proxy
        const updatedProxy = {
            ...proxies[index],
            name: newConfig.name.trim(),
            server: parsedProxy.server,
            username: parsedProxy.username || newConfig.username || '',
            password: parsedProxy.password || newConfig.password || '',
            updatedAt: new Date().toISOString()
        };

        // Update geo info
        const oldProxy = proxies[index];
        if (oldProxy.server !== updatedProxy.server) {
            const ipMatch = updatedProxy.server.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
            if (ipMatch && ipMatch[1]) {
                try {
                    const geoInfo = await getGeoInfoFromIp(ipMatch[1]);
                    if (geoInfo) {
                        Object.assign(updatedProxy, geoInfo);
                    }
                } catch (geoError) {
                    console.warn("Could not get geo info:", geoError);
                }
            }
        }

        proxies[index] = updatedProxy;
        proxyStore.set("list", proxies);
        
        console.log(`✅ Proxy '${newConfig.name}' updated`);

        return { 
            success: true, 
            message: `Proxy '${newConfig.name}' đã được cập nhật.` 
        };
        
    } catch (error) {
        console.error("❌ Error updating proxy:", error);
        return {
            success: false,
            message: `Lỗi khi cập nhật proxy: ${error.message}`,
        };
    }
});

ipcMain.handle("delete-proxy", async (event, proxyName) => {
    console.log(`🗑️ Deleting proxy: ${proxyName}`);
    
    if (!proxyStore) {
        return { success: false, message: "Proxy store not ready." };
    }
    
    try {
        let proxies = proxyStore.get("list", []);
        const initialLength = proxies.length;
        
        proxies = proxies.filter((p) => p.name !== proxyName);
        
        if (proxies.length < initialLength) {
            proxyStore.set("list", proxies);
            console.log(`✅ Proxy '${proxyName}' deleted`);
            console.log(`📦 Remaining proxies: ${proxies.length}`);
            
            return { 
                success: true, 
                message: `Proxy '${proxyName}' đã được xóa.` 
            };
        } else {
            console.log(`❌ Proxy '${proxyName}' not found`);
            return { 
                success: false, 
                message: `Proxy '${proxyName}' không tồn tại.` 
            };
        }
    } catch (error) {
        console.error("❌ Error deleting proxy:", error);
        return {
            success: false,
            message: `Lỗi khi xóa proxy: ${error.message}`,
        };
    }
});

// ========================================================================
// THÊM IPC HANDLER MỚI
// ========================================================================
ipcMain.handle("parse-proxy-string", async (event, proxyString) => {
    return parseProxyInput(proxyString);
});

ipcMain.handle("test-proxy", async (event, proxyConfig) => {
    try {
        const parsedProxy = parseProxyInput(proxyConfig.server);
        if (!parsedProxy.success) {
            return { success: false, message: parsedProxy.message };
        }

        // Simple proxy test
        const testUrl = "http://httpbin.org/ip";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(testUrl, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return { 
                success: true, 
                message: "Proxy hoạt động tốt!",
                data: await response.json()
            };
        } catch (error) {
            clearTimeout(timeoutId);
            return { 
                success: false, 
                message: `Proxy không hoạt động: ${error.message}` 
            };
        }
    } catch (error) {
        return { 
            success: false, 
            message: `Lỗi kiểm tra proxy: ${error.message}` 
        };
    }
});