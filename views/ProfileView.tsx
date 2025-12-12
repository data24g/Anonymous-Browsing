import React, { useState } from 'react';
import { Globe, Play, Plus, User as UserIcon, Smartphone, Laptop, Square, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button, EmptyState, Input, Modal, Select } from '../components/UIComponents';
import { ProfileItem, ProxyItem } from '../types';
import { CPU_OPTIONS, MOCK_GPUS, MOCK_USER_AGENTS, RAM_OPTIONS, RESOLUTION_OPTIONS } from '../constants';

interface ProfileViewProps {
  t: any;
  profiles: ProfileItem[];
  proxies: ProxyItem[];
  setProfiles: (profiles: ProfileItem[]) => void;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ t, profiles, proxies, setProfiles, notify }) => {
  const [urlToOpen, setUrlToOpen] = useState('https://whoer.net');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'Overview' | 'Hardware' | 'Advanced'>('Overview');
  
  const [profileForm, setProfileForm] = useState<Partial<ProfileItem>>({
    name: '', deviceType: 'desktop', os: 'windows', browser: 'chrome', timezone: 'auto', userAgent: MOCK_USER_AGENTS[0],
    hardware: {
        cpuCores: 8, ram: 16, gpu: MOCK_GPUS[0], screenResolution: RESOLUTION_OPTIONS[0],
        audioContextNoise: true, canvasNoise: true, webGLNoise: true, webRTCPolicy: 'disable'
    }
  });

  const getHardwareState = () => {
    return profileForm.hardware || {
        cpuCores: 8, ram: 16, gpu: MOCK_GPUS[0], screenResolution: RESOLUTION_OPTIONS[0],
        audioContextNoise: true, canvasNoise: true, webGLNoise: true, webRTCPolicy: 'disable'
    };
  };

  const updateHardware = (key: keyof ProfileItem['hardware'], value: any) => {
      const currentHw = getHardwareState();
      setProfileForm({
          ...profileForm,
          hardware: { ...currentHw, [key]: value }
      });
  };

  const handleCreateProfile = () => {
    const hw = getHardwareState();
    const newProfile: ProfileItem = {
      id: Date.now().toString(),
      name: profileForm.name || `Profile ${profiles.length + 1}`,
      deviceType: profileForm.deviceType || 'desktop',
      os: profileForm.os || 'windows',
      browser: profileForm.browser || 'chrome',
      userAgent: profileForm.userAgent || MOCK_USER_AGENTS[0],
      timezone: profileForm.timezone || 'Asia/Ho_Chi_Minh',
      hardware: hw,
      status: 'stopped',
      proxyId: profileForm.proxyId
    };
    setProfiles([...profiles, newProfile]);
    setIsProfileModalOpen(false);
    
    // Reset form
    setProfileForm({ 
        name: '', deviceType: 'desktop', os: 'windows', browser: 'chrome', timezone: 'auto', userAgent: MOCK_USER_AGENTS[0],
        hardware: {
            cpuCores: 8, ram: 16, gpu: MOCK_GPUS[0], screenResolution: RESOLUTION_OPTIONS[0],
            audioContextNoise: true, canvasNoise: true, webGLNoise: true, webRTCPolicy: 'disable'
        }
    });
    setActiveProfileTab('Overview');
    notify(t.savedSuccessfully);
  };

  const toggleProfileStatus = (id: string) => {
    setProfiles(profiles.map(p => 
      p.id === id ? { ...p, status: p.status === 'running' ? 'stopped' : 'running' } : p
    ));
  };

  const deleteProfile = (id: string) => {
    if (confirm(t.confirmDelete)) {
      setProfiles(profiles.filter(p => p.id !== id));
      notify(t.deletedSuccessfully);
    }
  };

  const renderProfileModalContent = () => {
    const hw = getHardwareState();
    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
                {(['Overview', 'Hardware', 'Advanced'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveProfileTab(tab)}
                        className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                            activeProfileTab === tab 
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        {t[tab.toLowerCase() as keyof typeof t]}
                    </button>
                ))}
            </div>

            <div className="p-6 space-y-6">
                {activeProfileTab === 'Overview' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Input 
                            label={t.profileName} 
                            value={profileForm.name} 
                            onChange={e => setProfileForm({...profileForm, name: e.target.value})} 
                            placeholder="Profile 1"
                            className="bg-slate-800 text-white border-none focus:ring-2 focus:ring-blue-500" 
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Select 
                                label={t.os} 
                                value={profileForm.os}
                                onChange={e => setProfileForm({...profileForm, os: e.target.value as any})}
                                className="bg-slate-800 text-white border-none"
                            >
                                <option value="windows">Windows</option>
                                <option value="mac">macOS</option>
                                <option value="linux">Linux</option>
                                <option value="android">Android</option>
                            </Select>
                            <Select 
                                label={t.browser} 
                                value={profileForm.browser}
                                onChange={e => setProfileForm({...profileForm, browser: e.target.value as any})}
                                className="bg-slate-800 text-white border-none"
                            >
                                <option value="chrome">Chrome</option>
                                <option value="firefox">Firefox</option>
                                <option value="edge">Edge</option>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Proxy Connection</label>
                            <select 
                                className="w-full bg-slate-800 border-none text-white rounded-lg focus:ring-2 focus:ring-blue-500 block p-2.5"
                                value={profileForm.proxyId || ""}
                                onChange={(e) => setProfileForm({...profileForm, proxyId: e.target.value})}
                            >
                                <option value="">No Proxy (Direct Connection)</option>
                                {proxies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t.userAgent}</label>
                                <button 
                                    className="text-blue-500 text-xs flex items-center hover:underline"
                                    onClick={() => setProfileForm({...profileForm, userAgent: MOCK_USER_AGENTS[Math.floor(Math.random() * MOCK_USER_AGENTS.length)]})}
                                >
                                    <RefreshCw className="w-3 h-3 mr-1" /> {t.generate}
                                </button>
                            </div>
                            <textarea 
                                className="w-full bg-slate-800 border-none text-slate-300 text-xs font-mono rounded-lg p-3 h-24 focus:ring-2 focus:ring-blue-500"
                                value={profileForm.userAgent}
                                onChange={(e) => setProfileForm({...profileForm, userAgent: e.target.value})}
                            />
                        </div>
                    </div>
                )}

                {activeProfileTab === 'Hardware' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <div className="grid grid-cols-2 gap-4">
                             <Select label={t.cpuCores} value={hw.cpuCores} onChange={(e) => updateHardware('cpuCores', Number(e.target.value))} className="bg-slate-800 text-white border-none">
                                {CPU_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} Cores</option>)}
                             </Select>
                             <Select label={t.memory} value={hw.ram} onChange={(e) => updateHardware('ram', Number(e.target.value))} className="bg-slate-800 text-white border-none">
                                {RAM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} GB</option>)}
                             </Select>
                         </div>
                         <Select label={t.screenRes} value={hw.screenResolution} onChange={(e) => updateHardware('screenResolution', e.target.value)} className="bg-slate-800 text-white border-none">
                            {RESOLUTION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                         </Select>
                         <Select label={t.gpu} value={hw.gpu} onChange={(e) => updateHardware('gpu', e.target.value)} className="bg-slate-800 text-white border-none">
                             {MOCK_GPUS.map(gpu => <option key={gpu} value={gpu}>{gpu}</option>)}
                         </Select>
                    </div>
                )}

                {activeProfileTab === 'Advanced' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-lg p-4 flex items-start gap-3">
                           <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-500 shrink-0 mt-0.5" />
                           <div>
                              <h4 className="text-sm font-bold text-orange-800 dark:text-orange-400">{t.advancedWarn}</h4>
                              <p className="text-xs text-orange-700 dark:text-orange-500/80 mt-1 leading-relaxed">{t.advancedWarnDesc}</p>
                           </div>
                        </div>

                        <div className="space-y-3">
                             <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                 <div><span className="block text-sm font-medium text-slate-900 dark:text-white">{t.canvasNoise}</span><span className="text-xs text-slate-500">Add unique noise to Canvas readouts</span></div>
                                 <input type="checkbox" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300" checked={hw.canvasNoise} onChange={(e) => updateHardware('canvasNoise', e.target.checked)} />
                             </div>
                             <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                 <div><span className="block text-sm font-medium text-slate-900 dark:text-white">{t.audioNoise}</span><span className="text-xs text-slate-500">Spoof Audio stack signatures</span></div>
                                 <input type="checkbox" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300" checked={hw.audioContextNoise} onChange={(e) => updateHardware('audioContextNoise', e.target.checked)} />
                             </div>
                             <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                 <div className="flex justify-between items-center mb-2"><div><span className="block text-sm font-medium text-slate-900 dark:text-white">{t.webrtc}</span><span className="text-xs text-slate-500">Control IP leakage via WebRTC</span></div></div>
                                 <select className="w-full bg-slate-700 border-none text-white text-sm rounded-lg p-2.5" value={hw.webRTCPolicy} onChange={(e) => updateHardware('webRTCPolicy', e.target.value)}>
                                     <option value="disable">Disable</option>
                                     <option value="real_public_ip">Real Public IP</option>
                                     <option value="fake_ip">Fake IP</option>
                                 </select>
                             </div>
                        </div>
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                            <Select label="Timezone" value={profileForm.timezone} onChange={e => setProfileForm({...profileForm, timezone: e.target.value})}>
                                <option value="auto">Auto (Based on IP)</option>
                                <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
                                <option value="America/New_York">America/New_York</option>
                                <option value="Europe/London">Europe/London</option>
                            </Select>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white dark:bg-slate-850 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col md:flex-row gap-3">
         <div className="flex-1 relative">
            <Globe className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              value={urlToOpen}
              onChange={(e) => setUrlToOpen(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://..."
            />
         </div>
         <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { notify(`Launching all profiles to ${urlToOpen}`); }}>
                <Play className="w-4 h-4 mr-2" /> Test All
            </Button>
            <Button onClick={() => setIsProfileModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> {t.createProfile}
            </Button>
         </div>
      </div>

      {profiles.length === 0 ? (
        <EmptyState icon={<UserIcon className="w-16 h-16 text-slate-300" />} message={t.noProfiles} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {profiles.map(profile => (
            <div key={profile.id} className="group bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden">
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${profile.status === 'running' ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {profile.deviceType === 'mobile' ? <Smartphone className="w-6 h-6" /> : <Laptop className="w-6 h-6" />}
                     </div>
                     <div>
                       <h3 className="font-semibold text-lg leading-tight">{profile.name}</h3>
                       <p className="text-xs text-slate-500 mt-0.5 font-mono">{profile.id.substring(0,8)}</p>
                     </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${profile.status === 'running' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900' : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                    {profile.status === 'running' ? t.running : t.stopped}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
                   <div className="flex justify-between"><span>OS:</span> <span className="text-slate-900 dark:text-slate-200 capitalize">{profile.os}</span></div>
                   <div className="flex justify-between"><span>Proxy:</span> <span className="text-slate-900 dark:text-slate-200 truncate max-w-[150px]">{profile.proxyId ? proxies.find(p => p.id === profile.proxyId)?.name : 'Direct'}</span></div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button className="flex-1 py-1.5 text-sm" variant={profile.status === 'running' ? 'danger' : 'primary'} onClick={() => toggleProfileStatus(profile.id)}>
                     {profile.status === 'running' ? <><Square className="w-3 h-3 mr-1.5 fill-current" /> {t.stop}</> : <><Play className="w-3 h-3 mr-1.5 fill-current" /> {t.open}</>}
                  </Button>
                  <Button className="px-3" variant="secondary" onClick={() => deleteProfile(profile.id)}>
                     <Trash2 className="w-4 h-4 text-slate-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        title={t.createProfile}
        size="lg"
        footer={<><Button variant="secondary" onClick={() => setIsProfileModalOpen(false)}>{t.cancel}</Button><Button onClick={handleCreateProfile}>{t.save}</Button></>}
      >
        {renderProfileModalContent()}
      </Modal>
    </div>
  );
};