import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  MessageSquare, Globe, Brain, Swords, GitCompare, 
  Users, FlaskConical, ScanEye, Search, BookOpen, LineChart, ChevronRight, Settings, Code, Menu, X as CloseIcon,
  ChevronsLeft, ChevronsRight, PanelLeftClose, PanelLeftOpen, Home, Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { SystemStatus } from './SystemStatus';

export const Navigation = () => {
  const { currentMode, setCurrentMode, setSettingsOpen, deviceInfo } = useAppStore();
  const [isOpen, setIsOpen] = useState(false); // Mobile drawer state
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop sidebar collapse state

  const isMobile = deviceInfo.isMobile;

  const NavItem = ({ mode, icon: Icon, label, color }: any) => {
    const isActive = currentMode === mode;
    return (
      <motion.button
        whileHover={{ x: isCollapsed ? 0 : 4, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          setCurrentMode(mode);
          if (isMobile) setIsOpen(false);
        }}
        className={cn(
          "w-full flex items-center transition-all duration-300 group relative overflow-hidden",
          isActive 
            ? "bg-white/5 text-white shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]" 
            : "text-slate-500 hover:text-slate-200",
          isCollapsed ? "justify-center px-0 py-3 rounded-xl" : "justify-between px-4 py-3 rounded-2xl"
        )}
        title={isCollapsed ? label : undefined}
      >
        {isActive && !isCollapsed && (
          <motion.div 
            layoutId="navGlow"
            className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-white/40 to-transparent"
          />
        )}
        
        <div className={cn("flex items-center relative z-10", isCollapsed ? "justify-center" : "gap-3")}>
          <Icon size={18} className={cn("transition-all duration-500", isActive ? (color || "text-jb-accent shadow-[0_0_10px_rgba(60,113,247,0.5)]") : "group-hover:text-slate-300")} />
          {!isCollapsed && (
             <span className={cn("font-bold text-[13px] tracking-tight transition-colors duration-300 whitespace-nowrap", isActive ? "text-white" : "font-semibold")}>{label}</span>
          )}
        </div>
        
        {isActive && !isCollapsed && (
          <motion.div layoutId="navIndicator" className="flex items-center relative z-10">
             <ChevronRight size={12} className="text-white/30" />
          </motion.div>
        )}
      </motion.button>
    );
  };

  const navContent = (
    <div className={cn(
      "h-full flex flex-col relative z-20 transition-all duration-300",
      isMobile ? "w-full" : (isCollapsed ? "w-20" : "w-72")
    )}>
      <div className={cn(
        "flex items-center justify-between",
        isCollapsed ? "p-4 flex-col gap-6" : "p-8 pb-10"
      )}>
        {/* Desktop Collapse Toggle */}
        {!isMobile && (
           <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                 "p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors",
                 isCollapsed ? "mt-2" : ""
              )}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
           >
              {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
           </button>
        )}

        {isMobile && (
          <button onClick={() => setIsOpen(false)} className="p-2 text-slate-500 hover:text-white">
            <CloseIcon size={24} />
          </button>
        )}
      </div>

      <div className={cn("flex-1 overflow-y-auto scrollbar-hide space-y-10", isCollapsed ? "px-2 space-y-6" : "px-6")}>
        <div className="space-y-1.5">
          {!isCollapsed && <p className="px-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 opacity-40">Modes</p>}
          <NavItem mode="home" icon={Home} label="Overview" />
          <NavItem mode="chat" icon={MessageSquare} label="Chat" />
          <NavItem mode="vision" icon={ScanEye} label="SolventSee Lab" color="text-jb-orange" />
          <NavItem mode="coding" icon={Code} label="Coding Suite" color="text-jb-accent" />
          <NavItem mode="browser" icon={Globe} label="Web Search" color="text-jb-cyan" />
        </div>
        <div className="space-y-1.5">
           {!isCollapsed && <p className="px-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 opacity-40">Model Playground</p>}
           <NavItem mode="model_playground" icon={Sparkles} label="Playground Home" color="text-jb-purple" />
           <NavItem mode="compare" icon={GitCompare} label="Compare" />
           <NavItem mode="debate" icon={Swords} label="Debate" />
           <NavItem mode="collaborate" icon={Users} label="Multi-Agent" />
           <NavItem mode="waterfall" icon={FlaskConical} label="Waterfall Lab" color="text-jb-purple" />
        </div>
      </div>

      <div className={cn("p-8 pt-0", isCollapsed ? "p-3" : "")}>
        <SystemStatus collapsed={isCollapsed} />
        
        <div className={cn("mt-4", isCollapsed ? "mt-4" : "")}>
           <motion.button
             whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', x: isCollapsed ? 0 : 4 }}
             whileTap={{ scale: 0.98 }}
             onClick={() => {
               setSettingsOpen(true);
               if (isMobile) setIsOpen(false);
             }}
             className={cn(
               "w-full flex items-center rounded-2xl text-slate-500 hover:text-white transition-all group",
               isCollapsed ? "justify-center py-3" : "gap-3 px-4 py-3"
             )}
             title="Settings"
           >
              <div className={cn("flex items-center justify-center transition-colors", isCollapsed ? "" : "w-8 h-8 rounded-lg bg-white/5 group-hover:bg-white/10")}>
                 <Settings size={16} />
              </div>
              {!isCollapsed && <span className="text-[13px] font-bold tracking-tight">Settings</span>}
           </motion.button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed top-6 left-6 z-40 p-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl text-white"
        >
          <Menu size={20} />
        </button>
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              />
              <motion.div 
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[320px] bg-slate-950 z-[60] border-r border-white/10 shadow-2xl"
              >
                {navContent}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <motion.div 
       className="h-full bg-black/40 backdrop-blur-3xl border-r border-white/5 flex flex-col relative z-20 overflow-hidden"
       animate={{ width: isCollapsed ? 80 : 288 }} // 288 = w-72, 80 = w-20
       transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {navContent}
    </motion.div>
  );
};