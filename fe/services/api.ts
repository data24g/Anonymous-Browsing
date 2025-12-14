import { User, ProfileItem, ProxyItem } from '../types';
import { getApiUrl, getAvailableApiUrl, checkServerHealth, getApiConfig, saveApiConfig } from '../config/api.config';
import { getProxyConfig, getProxyUrl } from '../config/proxy.config';

/**
 * Helper function để lấy token từ localStorage
 */
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

/**
 * Helper function để lấy headers với authentication
 */
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

/**
 * Helper function để lấy userId từ localStorage (fallback)
 */
const getCurrentUserEmail = (): string | null => {
  try {
    const userStr = localStorage.getItem('accsafe_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user?.email || null;
    }
  } catch (e) {
    console.error('[API] Error getting user email:', e);
  }
  return null;
};

/**
 * Fallback: Tạo profile trong localStorage
 */
const createProfileLocalStorage = (profile: Omit<ProfileItem, 'id' | 'createdAt' | 'updatedAt'>): ProfileItem => {
  const userId = getCurrentUserEmail();
  if (!userId) {
    throw new Error('Vui lòng đăng nhập để tạo profile');
  }

  const newProfile: ProfileItem = {
    ...profile,
    userId,
    id: Date.now().toString(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Lưu vào localStorage
  try {
    const existing = localStorage.getItem('accsafe_profiles');
    const profiles: ProfileItem[] = existing ? JSON.parse(existing) : [];
    profiles.push(newProfile);
    localStorage.setItem('accsafe_profiles', JSON.stringify(profiles));
  } catch (e) {
    console.error('[ProfileAPI] Error saving to localStorage:', e);
  }

  return newProfile;
};

/**
 * Fallback: Lấy profiles từ localStorage
 */
const getProfilesLocalStorage = (): ProfileItem[] => {
  try {
    const userId = getCurrentUserEmail();
    if (!userId) return [];

    const existing = localStorage.getItem('accsafe_profiles');
    const profiles: ProfileItem[] = existing ? JSON.parse(existing) : [];
    // Chỉ trả về profiles của user hiện tại
    return profiles.filter(p => p.userId === userId);
  } catch (e) {
    console.error('[ProfileAPI] Error reading from localStorage:', e);
    return [];
  }
};

/**
 * Fallback: Cập nhật profile trong localStorage
 */
const updateProfileLocalStorage = (profileId: string, updates: Partial<ProfileItem>): ProfileItem => {
  try {
    const userId = getCurrentUserEmail();
    if (!userId) {
      throw new Error('Vui lòng đăng nhập');
    }

    const existing = localStorage.getItem('accsafe_profiles');
    const profiles: ProfileItem[] = existing ? JSON.parse(existing) : [];
    const profileIndex = profiles.findIndex(p => p.id === profileId && p.userId === userId);
    
    if (profileIndex === -1) {
      throw new Error('Không tìm thấy profile');
    }

    const updatedProfile: ProfileItem = {
      ...profiles[profileIndex],
      ...updates,
      updatedAt: Date.now(),
    };

    profiles[profileIndex] = updatedProfile;
    localStorage.setItem('accsafe_profiles', JSON.stringify(profiles));
    return updatedProfile;
  } catch (e) {
    console.error('[ProfileAPI] Error updating in localStorage:', e);
    throw e;
  }
};

/**
 * Fallback: Xóa profile từ localStorage
 */
const deleteProfileLocalStorage = (profileId: string): void => {
  try {
    const userId = getCurrentUserEmail();
    if (!userId) {
      throw new Error('Vui lòng đăng nhập');
    }

    const existing = localStorage.getItem('accsafe_profiles');
    const profiles: ProfileItem[] = existing ? JSON.parse(existing) : [];
    // Chỉ xóa profile của user hiện tại
    const filtered = profiles.filter(p => !(p.id === profileId && p.userId === userId));
    localStorage.setItem('accsafe_profiles', JSON.stringify(filtered));
  } catch (e) {
    console.error('[ProfileAPI] Error deleting from localStorage:', e);
    throw e;
  }
}; 

export const authApi = {
  /**
   * Gọi API Đăng nhập
   * Phương thức: POST
   * Body: { email, password }
   */
  login: async (email: string, password: string): Promise<User> => {
    const config = getApiConfig();
    const urls = [
      config.useLocalServer ? config.localUrl : config.remoteUrl,
      config.useLocalServer ? config.remoteUrl : config.localUrl,
    ];

    let lastError: Error | null = null;

    // Thử cả hai server nếu một server fail
    for (let i = 0; i < urls.length; i++) {
      const apiUrl = urls[i];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 giây timeout

      try {
        console.log(`[AuthAPI] Attempting login with server ${i + 1}/${urls.length}: ${apiUrl}`);
        
        const response = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
          },
          body: JSON.stringify({ email, password }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // Xử lý lỗi từ Server trả về (VD: 401 Unauthorized, 400 Bad Request)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const serverError = new Error(errorData.message || `Lỗi đăng nhập: ${response.status}`);
          // Lỗi từ server (401, 400, etc.) - không retry, throw ngay
          throw serverError;
        }

        const data = await response.json();
        
        // Lưu Token vào LocalStorage để dùng cho các request sau (Profile, Proxy...)
        if (data.token) {
            localStorage.setItem('auth_token', data.token);
        }

        // Nếu thành công với fallback server, lưu cấu hình mới
        if (i === 1) {
          saveApiConfig({ useLocalServer: !config.useLocalServer });
          console.log(`[AuthAPI] Login successful with fallback server: ${apiUrl}`);
        }

        // Map dữ liệu từ Server về đúng định dạng User của App
        return {
          username: data.user.name || email.split('@')[0],
          email: data.user.email,
          isLoggedIn: true,
          isAdmin: data.user.role === 'admin'
        };
      } catch (error: any) {
        clearTimeout(timeoutId);
        lastError = error;

        // Nếu là lỗi từ server (401, 400, etc.) - không retry
        if (error.message && !error.message.includes('fetch') && !error.message.includes('Failed to fetch') && !error.message.includes('network') && error.name !== 'AbortError') {
          console.error(`[AuthAPI] Server returned error:`, error.message);
          throw error;
        }

        // Nếu là timeout
        if (error.name === 'AbortError') {
          console.warn(`[AuthAPI] Timeout connecting to ${apiUrl}`);
          if (i < urls.length - 1) {
            console.warn(`[AuthAPI] Trying next server...`);
            continue;
          }
          throw new Error('Kết nối đến server quá lâu. Vui lòng kiểm tra kết nối mạng.');
        }

        // Nếu là lỗi network và còn server khác để thử
        if (i < urls.length - 1) {
          console.warn(`[AuthAPI] Login failed with server ${i + 1} (${apiUrl}), trying fallback...`);
          continue;
        }

        // Đã thử hết cả hai server
        console.error(`[AuthAPI] All servers failed. Last error:`, error);
      }
    }

    // Nếu đến đây, cả hai server đều fail
    const errorMessage = lastError?.message || 'Không thể kết nối đến máy chủ';
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed')) {
      throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra:\n1. Server có đang chạy không?\n2. Kết nối mạng có ổn định không?\n3. Firewall có chặn kết nối không?');
    }
    throw lastError || new Error('Không thể kết nối đến máy chủ');
  },

  /**
   * Gọi API Đăng ký
   * Phương thức: POST
   * Body: { email, password }
   */
  register: async (email: string, password: string): Promise<User> => {
    try {
        const apiUrl = await getAvailableApiUrl();
        const response = await fetch(`${apiUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Đăng ký thất bại');
        }

        const data = await response.json();
        
        if (data.token) {
            localStorage.setItem('auth_token', data.token);
            return {
                username: data.user.name || email.split('@')[0],
                email: data.user.email,
                isLoggedIn: true,
                isAdmin: false
            };
        }
        
        return {
            username: email.split('@')[0],
            email: email,
            isLoggedIn: true,
            isAdmin: false
        };

    } catch (error: any) {
        console.error("Register Error:", error);
        throw new Error(error.message || 'Không thể kết nối đến máy chủ');
    }
  }
};

/**
 * API Functions cho Profiles
 * Mỗi user chỉ có thể xem và quản lý profiles của chính mình
 */
export const profileAPI = {
  /**
   * GET /api/profiles
   * Lấy tất cả profiles của user hiện tại (tự động lấy từ token)
   */
  getProfiles: async (): Promise<ProfileItem[]> => {
    try {
      // Lấy userId từ currentUser
      const userStr = localStorage.getItem('accsafe_user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const userId = currentUser?.email;

      if (!userId) {
        throw new Error('Vui lòng đăng nhập');
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/profiles?userId=${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        // Nếu endpoint chưa tồn tại (404), fallback về localStorage
        if (response.status === 404) {
          console.warn('[ProfileAPI] Endpoint /api/profiles chưa được implement, sử dụng localStorage fallback');
          return getProfilesLocalStorage();
        }
        if (response.status === 401) {
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Lỗi khi tải profiles: ${response.status}`);
      }

      const data = await response.json();
      const serverProfiles = data.profiles || [];
      
      // Đồng bộ: Xóa các profile trong localStorage không còn trong server
      // (để tránh trường hợp đã xóa trên server nhưng vẫn còn trong localStorage)
      try {
        const userId = getCurrentUserEmail();
        if (userId) {
          const existing = localStorage.getItem('accsafe_profiles');
          const localProfiles: ProfileItem[] = existing ? JSON.parse(existing) : [];
          const serverProfileIds = new Set(serverProfiles.map((p: ProfileItem) => p.id));
          
          // Chỉ giữ lại profiles có trong server hoặc không thuộc user hiện tại
          const syncedProfiles = localProfiles.filter(p => 
            p.userId !== userId || serverProfileIds.has(p.id)
          );
          
          // Thêm các profile mới từ server vào localStorage
          serverProfiles.forEach((serverProfile: ProfileItem) => {
            const existingIndex = syncedProfiles.findIndex(p => p.id === serverProfile.id);
            if (existingIndex >= 0) {
              syncedProfiles[existingIndex] = serverProfile; // Update với data từ server
            } else {
              syncedProfiles.push(serverProfile); // Thêm mới
            }
          });
          
          localStorage.setItem('accsafe_profiles', JSON.stringify(syncedProfiles));
        }
      } catch (syncError) {
        console.warn('[ProfileAPI] Error syncing with localStorage:', syncError);
        // Không throw error, chỉ log warning
      }
      
      return serverProfiles;
    } catch (error: any) {
      // Nếu lỗi network hoặc endpoint không tồn tại, fallback về localStorage
      if (error.message.includes('Failed to fetch') || error.message.includes('404')) {
        console.warn('[ProfileAPI] API không khả dụng, sử dụng localStorage fallback');
        return getProfilesLocalStorage();
      }
      console.error('[ProfileAPI] Error fetching profiles:', error);
      throw new Error(error.message || 'Không thể tải danh sách profiles');
    }
  },

  /**
   * POST /api/profiles
   * Tạo profile mới cho user hiện tại
   */
  createProfile: async (profile: Omit<ProfileItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProfileItem> => {
    try {
      // Đảm bảo có userId
      if (!profile.userId) {
        const userStr = localStorage.getItem('accsafe_user');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        if (!currentUser?.email) {
          throw new Error('Vui lòng đăng nhập');
        }
        profile.userId = currentUser.email;
      }

      // Sử dụng getAvailableApiUrl để tự động fallback nếu server không khả dụng
      const apiUrl = await getAvailableApiUrl();
      const url = `${apiUrl}/profiles`;
      const headers = getAuthHeaders();
      const body = JSON.stringify(profile);
      
      console.log('[ProfileAPI] Creating profile:', { url, hasAuth: !!headers.Authorization, userId: profile.userId });

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        // Nếu endpoint chưa tồn tại (404), fallback về localStorage
        if (response.status === 404) {
          console.warn('[ProfileAPI] Endpoint /api/profiles chưa được implement, sử dụng localStorage fallback');
          return createProfileLocalStorage(profile);
        }
        if (response.status === 401) {
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('[ProfileAPI] Error response:', { 
          status: response.status, 
          statusText: response.statusText, 
          errorData,
          url,
          requestBody: { ...profile, hardware: '***' }
        });
        
        // Nếu error message là từ register endpoint, đó là lỗi routing hoặc server không đúng
        if (errorData.message && errorData.message.includes('email và mật khẩu')) {
          console.error('[ProfileAPI] Server returned register endpoint error - possible routing issue');
          throw new Error('Lỗi kết nối server. Vui lòng kiểm tra lại kết nối mạng hoặc đăng nhập lại.');
        }
        
        // Nếu là lỗi 400 Bad Request, hiển thị message cụ thể
        if (response.status === 400) {
          throw new Error(errorData.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin profile.');
        }
        
        throw new Error(errorData.message || `Lỗi khi tạo profile: ${response.status}`);
      }

      const data = await response.json();
      return data.profile;
    } catch (error: any) {
      console.error('[ProfileAPI] Error creating profile:', error);
      
      // Fallback về localStorage nếu server không khả dụng
      if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('ERR_CONNECTION') || error.message.includes('404'))) {
        console.warn('[ProfileAPI] Server không khả dụng, sử dụng localStorage fallback');
        return createProfileLocalStorage(profile);
      }
      
      throw new Error(error.message || 'Không thể tạo profile');
    }
  },

  /**
   * PUT /api/profiles/:id
   * Cập nhật profile (chỉ có thể cập nhật profile của chính mình)
   */
  updateProfile: async (profileId: string, updates: Partial<ProfileItem>): Promise<ProfileItem> => {
    try {
      // Lấy userId từ currentUser
      const userStr = localStorage.getItem('accsafe_user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const userId = currentUser?.email;

      if (!userId) {
        throw new Error('Vui lòng đăng nhập');
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/profiles/${profileId}?userId=${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...updates,
          userId, // Đảm bảo userId trong body
          updatedAt: Date.now(),
        }),
      });

      if (!response.ok) {
        // Nếu endpoint chưa tồn tại (404), fallback về localStorage
        if (response.status === 404) {
          console.warn('[ProfileAPI] Endpoint /api/profiles/:id chưa được implement, sử dụng localStorage fallback');
          return updateProfileLocalStorage(profileId, updates);
        }
        if (response.status === 401) {
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        if (response.status === 403) {
          throw new Error('Bạn không có quyền cập nhật profile này');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Lỗi khi cập nhật profile: ${response.status}`);
      }

      const data = await response.json();
      return data.profile;
    } catch (error: any) {
      // Nếu lỗi network hoặc endpoint không tồn tại, fallback về localStorage
      if (error.message.includes('Failed to fetch') || error.message.includes('404')) {
        console.warn('[ProfileAPI] API không khả dụng, sử dụng localStorage fallback');
        return updateProfileLocalStorage(profileId, updates);
      }
      console.error('[ProfileAPI] Error updating profile:', error);
      throw new Error(error.message || 'Không thể cập nhật profile');
    }
  },

  /**
   * DELETE /api/profiles/:id
   * Xóa profile (chỉ có thể xóa profile của chính mình)
   */
  deleteProfile: async (profileId: string): Promise<void> => {
    try {
      // Lấy userId từ currentUser
      const userStr = localStorage.getItem('accsafe_user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const userId = currentUser?.email;

      if (!userId) {
        throw new Error('Vui lòng đăng nhập');
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/profiles/${profileId}?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        // Nếu endpoint chưa tồn tại (404), fallback về localStorage
        if (response.status === 404) {
          console.warn('[ProfileAPI] Endpoint /api/profiles/:id chưa được implement, sử dụng localStorage fallback');
          deleteProfileLocalStorage(profileId);
          return;
        }
        if (response.status === 401) {
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        if (response.status === 403) {
          throw new Error('Bạn không có quyền xóa profile này');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Lỗi khi xóa profile: ${response.status}`);
      }

      // Xóa thành công từ server, cũng xóa khỏi localStorage để đồng bộ
      try {
        deleteProfileLocalStorage(profileId);
      } catch (e) {
        // Không quan trọng nếu xóa localStorage fail, vì đã xóa thành công trên server
        console.warn('[ProfileAPI] Could not sync delete to localStorage:', e);
      }
    } catch (error: any) {
      // Nếu lỗi network hoặc endpoint không tồn tại, fallback về localStorage
      if (error.message.includes('Failed to fetch') || error.message.includes('404')) {
        console.warn('[ProfileAPI] API không khả dụng, sử dụng localStorage fallback');
        deleteProfileLocalStorage(profileId);
        return;
      }
      console.error('[ProfileAPI] Error deleting profile:', error);
      throw new Error(error.message || 'Không thể xóa profile');
    }
  },
};

/**
 * API Functions cho Proxies
 * Mỗi user chỉ có thể xem và quản lý proxies của chính mình
 */
export const proxyAPI = {
  /**
   * GET /api/proxies
   * Lấy tất cả proxies của user hiện tại (tự động lấy từ token)
   */
  getProxies: async (): Promise<ProxyItem[]> => {
    try {
      // Lấy userId từ currentUser
      const userStr = localStorage.getItem('accsafe_user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const userId = currentUser?.email;

      if (!userId) {
        throw new Error('Vui lòng đăng nhập');
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/proxies?userId=${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Lỗi khi tải proxies: ${response.status}`);
      }

      const data = await response.json();
      return data.proxies || [];
    } catch (error: any) {
      console.error('[ProxyAPI] Error fetching proxies:', error);
      throw new Error(error.message || 'Không thể tải danh sách proxies');
    }
  },

  /**
   * POST /api/proxies
   * Tạo proxy mới cho user hiện tại
   */
  createProxy: async (proxy: Omit<ProxyItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProxyItem> => {
    try {
      // Đảm bảo có userId
      if (!proxy.userId) {
        const userStr = localStorage.getItem('accsafe_user');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        if (!currentUser?.email) {
          throw new Error('Vui lòng đăng nhập');
        }
        proxy.userId = currentUser.email;
      }

      // Sử dụng getAvailableApiUrl để tự động fallback nếu server không khả dụng
      let apiUrl: string;
      try {
        apiUrl = await getAvailableApiUrl();
      } catch (error: any) {
        console.error('[ProxyAPI] Error getting API URL:', error);
        // Fallback: thử dùng URL hiện tại từ config
        apiUrl = getApiUrl();
      }
      
      const url = `${apiUrl}/proxies`;
      const headers = getAuthHeaders();
      const body = JSON.stringify(proxy);
      
      console.log('[ProxyAPI] Creating proxy:', { url, hasAuth: !!headers.Authorization, userId: proxy.userId });

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        // Thêm timeout để tránh đợi quá lâu
        signal: AbortSignal.timeout(15000), // 15 giây
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('[ProxyAPI] Error response:', { 
          status: response.status, 
          statusText: response.statusText, 
          errorData,
          url,
          requestBody: proxy
        });
        
        // Nếu error message là từ register endpoint, đó là lỗi routing hoặc server không đúng
        if (errorData.message && errorData.message.includes('email và mật khẩu')) {
          console.error('[ProxyAPI] Server returned register endpoint error - possible routing issue');
          throw new Error('Lỗi kết nối server. Vui lòng kiểm tra lại kết nối mạng hoặc đăng nhập lại.');
        }
        
        // Nếu là lỗi 400 Bad Request, hiển thị message cụ thể
        if (response.status === 400) {
          throw new Error(errorData.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin proxy.');
        }
        
        throw new Error(errorData.message || `Lỗi khi tạo proxy: ${response.status}`);
      }

      const data = await response.json();
      return data.proxy;
    } catch (error: any) {
      console.error('[ProxyAPI] Error creating proxy:', error);
      
      // Nếu là lỗi network hoặc timeout
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw new Error('Kết nối đến server quá lâu. Vui lòng kiểm tra kết nối mạng hoặc đảm bảo server đang chạy.');
      }
      
      if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('ERR_CONNECTION') || error.message.includes('ECONNREFUSED'))) {
        throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc đảm bảo server đang chạy.');
      }
      
      throw new Error(error.message || 'Không thể tạo proxy');
    }
  },

  /**
   * PUT /api/proxies/:id
   * Cập nhật proxy (chỉ có thể cập nhật proxy của chính mình)
   */
  updateProxy: async (proxyId: string, updates: Partial<ProxyItem>): Promise<ProxyItem> => {
    try {
      // Lấy userId từ currentUser
      const userStr = localStorage.getItem('accsafe_user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const userId = currentUser?.email;

      if (!userId) {
        throw new Error('Vui lòng đăng nhập');
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/proxies/${proxyId}?userId=${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...updates,
          userId, // Đảm bảo userId trong body
          updatedAt: Date.now(),
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        if (response.status === 403) {
          throw new Error('Bạn không có quyền cập nhật proxy này');
        }
        if (response.status === 404) {
          throw new Error('Không tìm thấy proxy');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Lỗi khi cập nhật proxy: ${response.status}`);
      }

      const data = await response.json();
      return data.proxy;
    } catch (error: any) {
      console.error('[ProxyAPI] Error updating proxy:', error);
      throw new Error(error.message || 'Không thể cập nhật proxy');
    }
  },

  /**
   * DELETE /api/proxies/:id
   * Xóa proxy (chỉ có thể xóa proxy của chính mình)
   */
  deleteProxy: async (proxyId: string): Promise<void> => {
    try {
      // Lấy userId từ currentUser
      const userStr = localStorage.getItem('accsafe_user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const userId = currentUser?.email;

      if (!userId) {
        throw new Error('Vui lòng đăng nhập');
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/proxies/${proxyId}?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        if (response.status === 403) {
          throw new Error('Bạn không có quyền xóa proxy này');
        }
        if (response.status === 404) {
          throw new Error('Không tìm thấy proxy');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Lỗi khi xóa proxy: ${response.status}`);
      }
    } catch (error: any) {
      console.error('[ProxyAPI] Error deleting proxy:', error);
      throw new Error(error.message || 'Không thể xóa proxy');
    }
  },
};