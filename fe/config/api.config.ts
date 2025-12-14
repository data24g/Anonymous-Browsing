/**
 * API Configuration
 * Quản lý cấu hình kết nối với server (local hoặc remote)
 */

export interface ApiConfig {
  useLocalServer: boolean;
  localUrl: string;
  remoteUrl: string;
  timeout: number;
}

// Cấu hình mặc định
const defaultConfig: ApiConfig = {
  useLocalServer: false, // Mặc định dùng remote server
  localUrl: "http://localhost:3000/api",
  remoteUrl: "http://163.44.193.71:3000/api", // IP VPS của bạn
  timeout: 10000, // 10 giây
};

/**
 * Lấy cấu hình API từ localStorage hoặc dùng mặc định
 */
export const getApiConfig = (): ApiConfig => {
  try {
    const savedConfig = localStorage.getItem("api_config");
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      return { ...defaultConfig, ...parsed };
    }
  } catch (error) {
    console.error("[ApiConfig] Error loading config:", error);
  }
  return defaultConfig;
};

/**
 * Lưu cấu hình API vào localStorage
 */
export const saveApiConfig = (config: Partial<ApiConfig>): void => {
  try {
    const currentConfig = getApiConfig();
    const newConfig = { ...currentConfig, ...config };
    localStorage.setItem("api_config", JSON.stringify(newConfig));
    console.log("[ApiConfig] Config saved:", newConfig);
  } catch (error) {
    console.error("[ApiConfig] Error saving config:", error);
  }
};

/**
 * Lấy API URL hiện tại dựa trên cấu hình
 */
export const getApiUrl = (): string => {
  const config = getApiConfig();
  return config.useLocalServer ? config.localUrl : config.remoteUrl;
};

/**
 * Kiểm tra server có khả dụng không
 */
export const checkServerHealth = async (url?: string): Promise<boolean> => {
  const checkUrl = url || getApiUrl().replace("/api", "/api/health");
  try {
    // Sử dụng AbortController thay vì AbortSignal.timeout() để tương thích với Electron
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 giây timeout

    try {
      const response = await fetch(checkUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        console.warn("[ApiConfig] Server health check timeout:", checkUrl);
      } else {
        throw fetchError;
      }
      return false;
    }
  } catch (error) {
    console.warn("[ApiConfig] Server health check failed:", error);
    return false;
  }
};

/**
 * Tự động chuyển đổi giữa local và remote nếu một trong hai không khả dụng
 * Ưu tiên local server nếu nó available
 */
export const getAvailableApiUrl = async (): Promise<string> => {
  const config = getApiConfig();

  // Luôn ưu tiên kiểm tra local server trước (nhanh hơn và đáng tin cậy hơn khi dev)
  const localHealth = await checkServerHealth(
    config.localUrl.replace("/api", "/api/health")
  );
  if (localHealth) {
    if (!config.useLocalServer) {
      console.log("[ApiConfig] Local server is available, switching to local");
      saveApiConfig({ useLocalServer: true });
    }
    return config.localUrl;
  }

  // Nếu local không available, kiểm tra remote
  const remoteHealth = await checkServerHealth(
    config.remoteUrl.replace("/api", "/api/health")
  );
  if (remoteHealth) {
    if (config.useLocalServer) {
      console.warn("[ApiConfig] Local server unavailable, switching to remote");
      saveApiConfig({ useLocalServer: false });
    }
    return config.remoteUrl;
  }

  // Cả hai đều không khả dụng, nhưng vẫn trả về local server (ưu tiên cho dev)
  // Health check có thể fail do network timeout, nhưng server vẫn có thể hoạt động
  console.warn(
    "[ApiConfig] Both servers health check failed, but will try to connect anyway (preferring local)"
  );
  return config.localUrl;
};
