import React, { useRef, useEffect, useState } from 'react';
import { MessageCircle, X, Bot, Send } from 'lucide-react';
import { ChatSession, ChatMessage, User } from '../types';

interface ChatWidgetProps {
  t: any;
  currentUser: User | null;
  chatSessions: ChatSession[];
  setChatSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ t, currentUser, chatSessions, setChatSessions, isOpen, setIsOpen }) => {
  const [userMessageInput, setUserMessageInput] = useState('');
  const userChatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen && userChatScrollRef.current) {
        userChatScrollRef.current.scrollTop = userChatScrollRef.current.scrollHeight;
    }
  }, [chatSessions, isOpen]);

  const handleSendUserMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userMessageInput.trim() || !currentUser) return;

    const newMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'user',
        text: userMessageInput,
        timestamp: Date.now()
    };

    setChatSessions(prev => {
        const existingSessionIndex = prev.findIndex(s => s.userEmail === currentUser.email);
        if (existingSessionIndex >= 0) {
            const updated = [...prev];
            updated[existingSessionIndex].messages.push(newMessage);
            updated[existingSessionIndex].lastUpdated = Date.now();
            return updated;
        } else {
            return [...prev, {
                userId: currentUser.email,
                userEmail: currentUser.email,
                messages: [newMessage],
                lastUpdated: Date.now()
            }];
        }
    });
    setUserMessageInput('');
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
      return (
        <div className="absolute bottom-6 right-6 z-40">
           <button 
               onClick={() => setIsOpen(true)}
               className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 font-medium animate-bounce-subtle"
           >
               <MessageCircle className="w-5 h-5" />
               {t.supportChat}
           </button>
       </div>
      );
  }

  return (
    <div className="absolute bottom-6 right-6 z-50 w-80 md:w-96 bg-white dark:bg-slate-850 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[500px] animate-in slide-in-from-bottom-5 fade-in duration-300">
        <div className="p-4 bg-blue-600 rounded-t-2xl flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-full"><Bot className="w-5 h-5" /></div>
                <span className="font-semibold">Support Team</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900 custom-scrollbar" ref={userChatScrollRef}>
            <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-none px-4 py-2.5 max-w-[80%] text-sm shadow-sm">
                    Hello! How can we help you today?
                </div>
            </div>
            {chatSessions.find(s => s.userEmail === currentUser?.email)?.messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'}`}>
                        <div className="mb-1">{msg.text}</div>
                        <div className={`text-[10px] text-right ${msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                            {formatTime(msg.timestamp)}
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <form onSubmit={handleSendUserMessage} className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 rounded-b-2xl">
            <div className="flex gap-2">
                <input 
                    className="flex-1 bg-slate-100 dark:bg-slate-900 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder={t.typeMessage}
                    value={userMessageInput}
                    onChange={(e) => setUserMessageInput(e.target.value)}
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors shadow-sm disabled:opacity-50" disabled={!userMessageInput.trim()}>
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </form>
    </div>
  );
};