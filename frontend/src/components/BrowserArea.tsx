import React, { useState } from 'react';
import { 
  Search, ArrowLeft, ArrowRight, RotateCw, Globe, 
  ShieldCheck, ExternalLink, Zap, ExternalLink as LinkIcon,
  Layout, Command, Cpu, Network
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ChatService } from '../services/ChatService';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';

export const BrowserArea = () => {
  const { browserHistory, setBrowserHistory, lastSearchResults, setLastSearchResults, deviceInfo } = useAppStore();
  const [url, setUrl] = useState('https://google.com');
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(browserHistory.length > 0 ? browserHistory.length - 1 : 0);

  const handleNavigate = async (newUrl: string) => {
    if (!newUrl.trim()) return;
    setIsLoading(true);
    setInputUrl(newUrl);

    if (!newUrl.startsWith('http')) {
      try {
        console.log('[Browser] Searching for:', newUrl);
        const results = await ChatService.search(newUrl);
        console.log('[Browser] Raw Response:', results);
        
        // Handle both backend naming conventions (results vs organic)
        const items = results?.results || results?.organic || [];
        const answer = results?.answerBox || null;

        if (items.length > 0 || answer) {
          setLastSearchResults({ results: items, answerBox: answer });
          setUrl(`search://${encodeURIComponent(newUrl)}`);
        } else {
          console.warn('[Browser] No items or answerBox found');
          setLastSearchResults({ results: [], error: 'Zero matches returned from Serper' }); 
        }
      } catch (error: any) {
        console.error('[Browser] Search failed:', error);
        setLastSearchResults({ results: [], error: error.message || 'Network bridge failure' });
      }
    } else {
      setUrl(newUrl);
      setLastSearchResults(null);
    }
    
    // History Management
    setBrowserHistory([...browserHistory, newUrl]);
    setHistoryIndex(browserHistory.length);
    setIsLoading(false);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const prevUrl = browserHistory[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      handleNavigate(prevUrl);
    }
  };

  const goForward = () => {
    if (historyIndex < browserHistory.length - 1) {
      const nextUrl = browserHistory[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      handleNavigate(nextUrl);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#020205] overflow-hidden font-sans relative">
      <div className="absolute inset-0 neural-grid opacity-[0.03] pointer-events-none" />
      
      {/* Browser Chrome: Cinematic Header */}
      <div className="h-20 border-b border-white/5 flex items-center px-8 bg-black/40 backdrop-blur-xl relative z-30 gap-6">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
            <button onClick={goBack} disabled={historyIndex === 0} className="p-2 hover:bg-white/5 rounded-lg disabled:opacity-10 transition-all">
              <ArrowLeft size={16} className="text-white" />
            </button>
            <button onClick={goForward} disabled={historyIndex === browserHistory.length - 1} className="p-2 hover:bg-white/5 rounded-lg disabled:opacity-10 transition-all">
              <ArrowRight size={16} className="text-white" />
            </button>
            <button onClick={() => handleNavigate(inputUrl)} className="p-2 hover:bg-white/5 rounded-lg transition-all">
              <RotateCw size={16} className={cn("text-white", isLoading && "animate-spin text-jb-accent")} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-2.5 group focus-within:border-jb-accent/40 transition-all shadow-inner">
          <Globe size={14} className="text-slate-600 group-focus-within:text-jb-accent transition-colors" />
          <input 
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNavigate(inputUrl)}
            placeholder="URL or Search Query..."
            className="flex-1 bg-transparent text-xs font-bold text-white outline-none placeholder:text-slate-800 uppercase tracking-widest"
          />
          <AnimatePresence>
            {isLoading ? (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                 <Zap size={14} className="text-jb-orange animate-pulse" />
               </motion.div>
            ) : (
               <ShieldCheck size={14} className="text-emerald-500/60" />
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3">
           <div className="flex flex-col text-right hidden lg:flex">
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Session Node</span>
              <span className="text-[10px] font-mono text-jb-accent uppercase truncate max-w-[120px]">
                {url.startsWith('search') ? 'QUERY_STREAM' : new URL(url).hostname}
              </span>
           </div>
           <button className="px-5 py-2.5 bg-jb-accent/10 border border-jb-accent/20 text-jb-accent text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-jb-accent hover:text-white transition-all shadow-[0_0_20px_rgba(60,113,247,0.1)]">
             <ExternalLink size={14} className="inline mr-2" /> Popout
           </button>
        </div>
      </div>

      {/* Viewport Area */}
      <div className="flex-1 relative bg-transparent overflow-y-auto scrollbar-thin scroll-smooth p-6 md:p-12">
        {lastSearchResults ? (
          <div className="max-w-5xl mx-auto space-y-12 pb-24">
            {/* Header Stats */}
            <div className="flex items-end justify-between border-b border-white/5 pb-8">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-jb-accent animate-pulse" />
                   <h2 className="text-4xl md:text-5xl font-[900] text-white tracking-tighter uppercase">Web <span className="text-vibrant text-transparent bg-clip-text bg-gradient-to-r from-jb-accent to-jb-purple">Results</span></h2>
                </div>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Live Web Search // Results Synchronized</p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-right">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">Items Found</span>
                <span className="text-lg font-mono font-black text-white">0{lastSearchResults.results?.length || 0}</span>
              </div>
            </div>

            {lastSearchResults.answerBox && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 rounded-[2.5rem] bg-jb-accent/5 border border-jb-accent/20 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                   <Cpu size={120} />
                </div>
                <span className="text-[10px] font-black text-jb-accent uppercase tracking-[0.3em] block mb-4">Direct Answer</span>
                <h3 className="text-2xl font-black text-white mb-4 tracking-tight">{lastSearchResults.answerBox.title}</h3>
                <p className="text-slate-400 leading-relaxed text-base font-medium">{lastSearchResults.answerBox.answer || lastSearchResults.answerBox.snippet}</p>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {lastSearchResults.results?.map((result: any, idx: number) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={idx} 
                  className="group relative p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-jb-accent/20 hover:bg-white/[0.04] transition-all cursor-pointer overflow-hidden glass-panel"
                >
                  <a href={result.link} target="_blank" rel="noopener noreferrer" className="block space-y-4 h-full flex flex-col">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 text-[9px] font-black text-jb-accent uppercase tracking-widest">
                         <Network size={12} />
                         <span className="truncate max-w-[200px]">{new URL(result.link).hostname}</span>
                       </div>
                       <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-jb-accent transition-colors" />
                    </div>
                    <h3 className="text-xl font-black text-white group-hover:text-vibrant transition-all tracking-tight leading-tight flex-1">
                      {result.title}
                    </h3>
                    <p className="text-[13px] text-slate-500 font-medium leading-relaxed line-clamp-3 group-hover:text-slate-400 transition-colors">
                      {result.snippet}
                    </p>
                    <div className="pt-4 mt-auto flex items-center justify-between border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Access Node</span>
                       <LinkIcon size={14} className="text-jb-accent" />
                    </div>
                  </a>
                </motion.div>
              ))}
            </div>

            {(!lastSearchResults.results || lastSearchResults.results.length === 0) && (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="relative mb-8">
                   <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full animate-pulse" />
                   <Search size={64} className="relative z-10 text-rose-500/20" />
                </div>
                <p className="text-xl font-black text-slate-700 uppercase tracking-[0.2em]">No Results Found</p>
                <p className="text-xs text-rose-500/60 uppercase tracking-widest mt-2">
                  {lastSearchResults.error || 'Adjust search parameters and try again'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent">
            <div className="max-w-md text-center space-y-8 p-6">
              <div className="relative mx-auto w-32 h-32 mb-12">
                 <div className="absolute inset-0 bg-jb-accent/20 blur-[60px] rounded-full animate-pulse" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Globe size={80} className="text-jb-accent opacity-20" />
                 </div>
                 <div className="absolute inset-0 border-2 border-jb-accent/10 border-dashed rounded-full animate-[spin_20s_linear_infinite]" />
              </div>
              
              <div className="space-y-4">
                 <p className="text-2xl font-[900] text-white tracking-tighter uppercase">Web Browser <span className="text-vibrant">Standby</span></p>
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] leading-relaxed">
                   Enter a URL or search query to begin.
                 </p>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] text-left relative overflow-hidden glass-panel">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                   <Command size={32} />
                </div>
                <span className="text-[10px] font-black text-jb-accent uppercase tracking-widest block mb-3">Bridge Protocols</span>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">
                  Solvent AI will scan the open web, extract structural metadata, and provide real-time context for your current engineering mission.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar: Cinematic Footer */}
      <div className="h-12 px-8 bg-black border-t border-white/5 flex justify-between items-center relative z-30">
        <div className="flex items-center gap-6 text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            System_Bridge: Synchronized
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2">
             <Layout size={12} className="text-slate-700" />
             SSL_SECURE: {url.startsWith('search') ? 'DIRECT_STREAM' : 'ENCRYPTED_NODE'}
          </div>
        </div>
        <div className="flex items-center gap-6">
           <div className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] hidden sm:block">
             LATENCY: <span className="text-white/40 font-mono">{isLoading ? '--' : '142ms'}</span>
           </div>
           <div className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">
             FLOW: <span className="text-white/40 font-mono">2.4MB/S</span>
           </div>
        </div>
      </div>
    </div>
  );
};