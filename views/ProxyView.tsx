import React, { useState } from 'react';
import { Server, Plus, CheckCircle, Trash2 } from 'lucide-react';
import { Button, EmptyState, Input, Modal } from '../components/UIComponents';
import { ProxyItem } from '../types';

interface ProxyViewProps {
  t: any;
  proxies: ProxyItem[];
  setProxies: React.Dispatch<React.SetStateAction<ProxyItem[]>>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

export const ProxyView: React.FC<ProxyViewProps> = ({ t, proxies, setProxies, notify }) => {
  const [isProxyModalOpen, setIsProxyModalOpen] = useState(false);
  const [proxyForm, setProxyForm] = useState<Partial<ProxyItem>>({ name: '', ip: '', port: '' });

  const handleAddProxy = () => {
    if (!proxyForm.ip || !proxyForm.port) {
        notify("IP and Port are required", "error");
        return;
    }
    const newProxy: ProxyItem = {
      id: Date.now().toString(),
      name: proxyForm.name || `${proxyForm.ip}:${proxyForm.port}`,
      ip: proxyForm.ip,
      port: proxyForm.port,
      username: proxyForm.username,
      password: proxyForm.password,
      status: 'checking'
    };
    setProxies(prev => [...prev, newProxy]);
    setIsProxyModalOpen(false);
    setProxyForm({ name: '', ip: '', port: '' });
    notify(t.savedSuccessfully);
    
    // Simulate checking
    setTimeout(() => {
      setProxies(prev => prev.map(p => p.id === newProxy.id ? { ...p, status: 'active', location: 'VN - Ho Chi Minh' } : p));
    }, 1500);
  };

  const deleteProxy = (id: string) => {
    if (confirm(t.confirmDelete)) {
      setProxies(prev => prev.filter(p => p.id !== id));
      notify(t.deletedSuccessfully);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between mb-6">
        <h2 className="text-lg font-medium">Proxy List</h2>
        <Button onClick={() => setIsProxyModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> {t.addProxy}
        </Button>
      </div>

      {proxies.length === 0 ? (
        <EmptyState icon={<Server className="w-16 h-16 text-slate-300" />} message={t.noProxies} />
      ) : (
        <div className="bg-white dark:bg-slate-850 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {proxies.map(proxy => (
                <tr key={proxy.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium">{proxy.name}</td>
                  <td className="px-6 py-4 font-mono text-slate-500">{proxy.ip}:{proxy.port}</td>
                  <td className="px-6 py-4">{proxy.location || '-'}</td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                       ${proxy.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                         proxy.status === 'dead' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {proxy.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {proxy.status}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                     <button onClick={() => deleteProxy(proxy.id)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal 
        isOpen={isProxyModalOpen} 
        onClose={() => setIsProxyModalOpen(false)} 
        title={t.addProxy}
        footer={<><Button variant="secondary" onClick={() => setIsProxyModalOpen(false)}>{t.cancel}</Button><Button onClick={handleAddProxy}>{t.save}</Button></>}
      >
         <Input label="Name (Optional)" placeholder="My Proxy" value={proxyForm.name} onChange={e => setProxyForm({...proxyForm, name: e.target.value})} />
         <div className="grid grid-cols-2 gap-4">
            <Input label="IP Address" placeholder="192.168.1.1" value={proxyForm.ip} onChange={e => setProxyForm({...proxyForm, ip: e.target.value})} />
            <Input label="Port" placeholder="8080" value={proxyForm.port} onChange={e => setProxyForm({...proxyForm, port: e.target.value})} />
         </div>
         <div className="grid grid-cols-2 gap-4">
            <Input label="Username" placeholder="user" value={proxyForm.username} onChange={e => setProxyForm({...proxyForm, username: e.target.value})} />
            <Input label="Password" type="password" placeholder="pass" value={proxyForm.password} onChange={e => setProxyForm({...proxyForm, password: e.target.value})} />
         </div>
      </Modal>
    </div>
  );
};