import React from 'react';
import { ShoppingBag, Youtube, Chrome, Play } from 'lucide-react';
import { AUTOMATION_SCRIPTS } from '../constants';

interface AutomationViewProps {
  notify: (msg: string) => void;
}

export const AutomationView: React.FC<AutomationViewProps> = ({ notify }) => {
  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-lg font-semibold mb-6">Quick Automation Scripts</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {AUTOMATION_SCRIPTS.map(script => (
          <div key={script.id} className="bg-white dark:bg-slate-850 p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group shadow-sm hover:shadow-lg"
             onClick={() => notify(`Running script: ${script.name}`)}
          >
             <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {script.icon === 'Facebook' && <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.17 6 13 6c.87 0 1.7.08 1.7.08v2.7h-1.35c-1.23 0-1.65.6-1.65 1.4V12h3l-.48 3h-2.52v6.8c4.56-.93 8-4.96 8-9.8z"/></svg>}
                {script.icon === 'ShoppingBag' && <ShoppingBag className="w-6 h-6" />}
                {script.icon === 'Youtube' && <Youtube className="w-6 h-6" />}
                {script.icon === 'Chrome' && <Chrome className="w-6 h-6" />}
             </div>
             <h3 className="font-bold text-lg mb-1">{script.name}</h3>
             <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{script.url}</p>
             <div className="mt-4 flex items-center text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
               <Play className="w-3 h-3 mr-1 fill-current" /> Run Now
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};