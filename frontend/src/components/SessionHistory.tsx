import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Plus, Trash2, ChevronLeft, 
  ChevronRight, History, Clock, Search, MoreVertical 
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';

export const SessionHistory = () => {
  const { messages, setMessages, sessions } = useAppStore();
  const [isOpen, setIsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const allSessions = Object.keys(sessions).map(id => ({
    id,
    title: sessions[id][0]?.content.slice(0, 30) || 'New Conversation',
    time: '2h ago'
  }));

  const sessionList = searchTerm.trim()
    ? allSessions.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : allSessions;

  const createNewSession = () => {
    // Logic to clear current messages and start fresh
    setMessages([]);
  };

  return (
    <div className="relative h-full flex">
      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "absolute -right-4 top-1/2 -translate-y-1/2 z-50 w-8 h-8 rounded-full border border-white/5 bg-[#050508] text-slate-500 hover:text-white flex items-center justify-center transition-all",
          !isOpen && "rotate-180"
        )}
      >
        <ChevronLeft size={14} />
      </button>

      <motion.div
        initial={false}
        animate={{ width: isOpen ? 280 : 0, opacity: isOpen ? 1 : 0 }}
        className="h-full bg-[#050508]/40 border-r border-white/5 overflow-hidden flex flex-col"
      >
        <div className="p-6 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <History size={18} className="text-jb-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Archives</span>
            </div>
            <button 
              onClick={createNewSession}
              className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input 
              type="text"
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/5 rounded-xl py-2 pl-9 pr-4 text-[10px] font-bold text-white placeholder:text-slate-700 outline-none focus:border-jb-accent/30 transition-all"
            />
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
            {sessionList.length > 0 ? (
              sessionList.map((session) => (
                <div 
                  key={session.id}
                  className="group p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-jb-accent/20 hover:bg-jb-accent/5 transition-all cursor-pointer relative"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-jb-accent transition-colors">
                      <MessageSquare size={14} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-slate-300 truncate group-hover:text-white">{session.title}</span>
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter mt-0.5">{session.time}</span>
                    </div>
                  </div>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-slate-600 hover:text-rose-500">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-center px-4">
                <Clock size={24} className="text-slate-800 mb-3" />
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">No session data synchronized</p>
              </div>
            )}
          </div>

          {/* Footer Stats */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="p-4 rounded-2xl bg-jb-accent/5 border border-jb-accent/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[8px] font-black text-jb-accent uppercase tracking-widest">Memory Sync</span>
                <span className="text-[8px] font-mono text-jb-accent/60">98%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-[98%] bg-jb-accent shadow-[0_0_8px_rgba(60,113,247,0.5)]" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
