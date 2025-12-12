export type Language = 'en' | 'vi';
export type Theme = 'light' | 'dark';
export type View = 'auth' | 'profiles' | 'proxies' | 'automation' | 'support' | 'settings' | 'admin_chat';

export interface User {
  username: string;
  email: string;
  isLoggedIn: boolean;
  isAdmin?: boolean; // Mock admin role
}

export interface ProxyItem {
  id: string;
  name: string;
  ip: string;
  port: string;
  username?: string;
  password?: string;
  location?: string; // e.g., "US - New York"
  status: 'active' | 'dead' | 'checking' | 'unknown';
}

export interface ProfileItem {
  id: string;
  name: string;
  proxyId?: string;
  deviceType: 'desktop' | 'mobile';
  os: 'windows' | 'mac' | 'linux';
  browser: 'chrome' | 'firefox' | 'edge';
  userAgent: string;
  timezone: string;
  hardware: {
    cpuCores: number;
    ram: number;
    gpu: string;
    screenResolution: string;
    audioContextNoise: boolean;
    canvasNoise: boolean;
    webGLNoise: boolean;
    webRTCPolicy: 'disable' | 'real_public_ip' | 'fake_ip';
  };
  status: 'running' | 'stopped';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'admin';
  text: string;
  timestamp: number;
}

export interface ChatSession {
  userId: string; // usually email for this mock
  userEmail: string;
  messages: ChatMessage[];
  lastUpdated: number;
}

export interface AppConfig {
  language: Language;
  theme: Theme;
  autoClean: boolean;
  showNotifications: boolean;
}