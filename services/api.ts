import { User } from '../types';

// Đã cập nhật theo IP VPS của bạn
const API_URL = 'http://163.44.193.71:3000/api'; 

export const authApi = {
  /**
   * Gọi API Đăng nhập
   * Phương thức: POST
   * Body: { email, password }
   */
  login: async (email: string, password: string): Promise<User> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      // Xử lý lỗi từ Server trả về (VD: 401 Unauthorized, 400 Bad Request)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Lỗi đăng nhập: ${response.status}`);
      }

      const data = await response.json();
      
      // Lưu Token vào LocalStorage để dùng cho các request sau (Profile, Proxy...)
      if (data.token) {
          localStorage.setItem('auth_token', data.token);
      }

      // Map dữ liệu từ Server về đúng định dạng User của App
      return {
        username: data.user.name || email.split('@')[0],
        email: data.user.email,
        isLoggedIn: true,
        isAdmin: data.user.role === 'admin'
      };
    } catch (error: any) {
      // Ném lỗi ra để AuthView hiển thị lên giao diện
      console.error("Login Error:", error);
      throw new Error(error.message || 'Không thể kết nối đến máy chủ');
    }
  },

  /**
   * Gọi API Đăng ký
   * Phương thức: POST
   * Body: { email, password }
   */
  register: async (email: string, password: string): Promise<User> => {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
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