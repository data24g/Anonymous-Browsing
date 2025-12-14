import React, { useState, useEffect } from "react";
import {
  User as UserIcon,
  Server,
  Settings,
  Bot,
  HelpCircle,
  UserCog,
} from "lucide-react";
import {
  User,
  ProfileItem,
  ProxyItem,
  AppConfig,
  View,
  ChatSession,
} from "./types";
import { TRANSLATIONS } from "./constants";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { Toast, Button, Modal } from "./components/UIComponents";
import { Sidebar } from "./components/Sidebar";
import { ChatWidget } from "./components/ChatWidget";
import { TitleBar } from "./components/TitleBar"; // Import TitleBar
import { AuthView } from "./views/AuthView";
import { ProfileView } from "./views/ProfileView";
import { ProxyView } from "./views/ProxyView";
import { AutomationView } from "./views/AutomationView";
import { SupportView } from "./views/SupportView";
import { SettingsView } from "./views/SettingsView";
import { AdminChatView } from "./views/AdminChatView";
import { profileAPI, proxyAPI } from "./services/api";
import { checkProxyLocation } from "./services/proxyLocationChecker";

export default function App() {
  // --- Global State ---
  const [config, setConfig] = useLocalStorage<AppConfig>("accsafe_config", {
    language: "vi",
    theme: "light",
    autoClean: true,
    showNotifications: true,
  });
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>(
    "accsafe_user",
    null
  );
  // Profiles và Proxies sẽ được load từ API, không dùng localStorage nữa
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [proxies, setProxies] = useState<ProxyItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [chatSessions, setChatSessions] = useLocalStorage<ChatSession[]>(
    "accsafe_chats",
    []
  );

  // --- UI State ---
  const [currentView, setCurrentView] = useState<View>("auth");
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Chat State
  const [isUserChatOpen, setIsUserChatOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);

  // --- Effects ---
  // Load Profiles và Proxies từ API khi user login
  useEffect(() => {
    if (currentUser && currentUser.isLoggedIn) {
      setIsLoadingData(true);
      
      // Load profiles và proxies song song
      Promise.all([
        profileAPI.getProfiles().catch((error) => {
          console.error('[App] Error loading profiles:', error);
          notify(error.message || t.cannotLoadProfiles, 'error');
          return [];
        }),
        proxyAPI.getProxies().catch((error) => {
          console.error('[App] Error loading proxies:', error);
          notify(error.message || t.cannotLoadProxies, 'error');
          return [];
        }),
      ]).then(async ([loadedProfiles, loadedProxies]) => {
        // Normalize profiles: đảm bảo tất cả profile đều có hardware
        // Và reset tất cả status về "stopped" khi app mở lại (vì processes đã bị kill khi app tắt)
        const normalizedProfiles = loadedProfiles.map(profile => {
          const normalized = {
            ...profile,
            status: 'stopped' as const, // Reset về stopped khi app mở lại
            hardware: profile.hardware || {
              cpuCores: 8,
              ram: 16,
              gpu: 'NVIDIA GeForce RTX 3060',
              screenResolution: '1920x1080',
              audioContextNoise: true,
              canvasNoise: true,
              webGLNoise: true,
              webRTCPolicy: 'disable' as const,
            }
          };
          
          // Update status trong database nếu profile đang "running" (để đồng bộ)
          if (profile.status === 'running') {
            profileAPI.updateProfile(profile.id, { status: 'stopped' }).catch(err => {
              console.error(`[App] Error updating profile ${profile.id} status to stopped:`, err);
            });
          }
          
          return normalized;
        });
        setProfiles(normalizedProfiles);
        setProxies(loadedProxies);
        setIsLoadingData(false);

        // Check location cho các proxy chưa có location (bất đồng bộ, không block UI)
        loadedProxies.forEach(async (proxy) => {
          if (!proxy.location || proxy.location === 'Unknown' || proxy.location === '-') {
            try {
              const locationResult = await checkProxyLocation(proxy);
              if (locationResult.location && locationResult.location !== 'Unknown') {
                setProxies((prev) =>
                  prev.map((p) =>
                    p.id === proxy.id
                      ? { ...p, location: locationResult.location }
                      : p
                  )
                );
              }
            } catch (error) {
              console.error(`[App] Error checking location for proxy ${proxy.id}:`, error);
            }
          }
        });
      });
    } else {
      // Khi logout, clear data
      setProfiles([]);
      setProxies([]);
    }
  }, [currentUser?.email, currentUser?.isLoggedIn]);

  useEffect(() => {
    if (currentUser && currentView === "auth") {
      setCurrentView(currentUser.isAdmin ? "admin_chat" : "profiles");
    }
  }, [currentUser]);

  useEffect(() => {
    if (config.theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [config.theme]);

  // --- Helpers ---
  const t = TRANSLATIONS[config.language];
  const notify = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
  };

  // --- Handlers ---
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    notify(t.success);
  };

  const confirmLogout = () => {
    // Clear token khi logout
    localStorage.removeItem('auth_token');
    setCurrentUser(null);
    setProfiles([]);
    setProxies([]);
    setCurrentView("auth");
    setIsUserChatOpen(false);
    setIsLogoutModalOpen(false);
    notify(t.success);
  };

  // --- Render Content Wrapper ---
  // Bọc toàn bộ app trong 1 div flex column để TitleBar luôn ở trên cùng
  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden relative border border-slate-300 dark:border-slate-950">
      {/* Title Bar luôn hiển thị */}
      <TitleBar />

      {notification && (
        <Toast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {currentView === "auth" ? (
        <div className="flex-1 overflow-auto">
          <AuthView t={t} onLoginSuccess={handleLoginSuccess} />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            currentUser={currentUser}
            currentView={currentView}
            setCurrentView={setCurrentView}
            handleLogout={() => setIsLogoutModalOpen(true)}
            t={t}
          />

          <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            {/* Header của View */}
            <header className="h-16 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shadow-sm z-10">
              <h1 className="text-xl font-semibold flex items-center gap-2">
                {currentView === "profiles" && (
                  <>
                    <UserIcon className="text-blue-500" /> {t.profiles}
                  </>
                )}
                {currentView === "proxies" && (
                  <>
                    <Server className="text-purple-500" /> {t.proxies}
                  </>
                )}
                {currentView === "automation" && (
                  <>
                    <Bot className="text-orange-500" /> {t.automation}
                  </>
                )}
                {currentView === "support" && (
                  <>
                    <HelpCircle className="text-green-500" /> {t.support}
                  </>
                )}
                {currentView === "settings" && (
                  <>
                    <Settings className="text-slate-500" /> {t.settings}
                  </>
                )}
                {currentView === "admin_chat" && (
                  <>
                    <UserCog className="text-red-500" /> {t.adminPanel}
                  </>
                )}
              </h1>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                {currentView === "profiles" && (
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {profiles.length}
                    </span>{" "}
                    Profiles
                  </div>
                )}
              </div>
            </header>

            {/* View Content */}
            <div className="flex-1 overflow-auto p-6 custom-scrollbar relative">
              {currentView === "profiles" && (
                <ProfileView
                  t={t}
                  profiles={profiles}
                  proxies={proxies}
                  setProfiles={setProfiles}
                  notify={notify}
                  currentUser={currentUser}
                />
              )}
              {currentView === "proxies" && (
                <ProxyView
                  t={t}
                  proxies={proxies}
                  setProxies={setProxies}
                  notify={notify}
                  currentUser={currentUser}
                />
              )}
              {currentView === "automation" && (
                <AutomationView 
                  notify={notify} 
                  profiles={profiles}
                  proxies={proxies}
                />
              )}
              {currentView === "support" && <SupportView t={t} />}
              {currentView === "settings" && (
                <SettingsView
                  t={t}
                  config={config}
                  setConfig={setConfig}
                  notify={notify}
                />
              )}
              {currentView === "admin_chat" && (
                <AdminChatView
                  t={t}
                  chatSessions={chatSessions}
                  setChatSessions={setChatSessions}
                  selectedChatUser={selectedChatUser}
                  setSelectedChatUser={setSelectedChatUser}
                  notify={notify}
                />
              )}
            </div>

            {/* User Chat Widget */}
            {!currentUser?.isAdmin && currentView !== "admin_chat" && (
              <ChatWidget
                t={t}
                currentUser={currentUser}
                chatSessions={chatSessions}
                setChatSessions={setChatSessions}
                isOpen={isUserChatOpen}
                setIsOpen={setIsUserChatOpen}
              />
            )}
          </main>
        </div>
      )}

      {/* Logout Modal */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title={t.logout}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsLogoutModalOpen(false)}
            >
              {t.cancel}
            </Button>
            <Button variant="danger" onClick={confirmLogout}>
              {t.logout}
            </Button>
          </>
        }
      >
        <div className="p-6">
          <p className="text-slate-600 dark:text-slate-300">
            {t.confirmLogout}
          </p>
        </div>
      </Modal>
    </div>
  );
}
