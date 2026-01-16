import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';

const AuraBackground: React.FC<{ children: React.ReactNode }> = memo(({ children }) => {
  const { auraMode } = useAppStore();

  return (
    <div className="relative min-h-screen w-full bg-[#030305] overflow-hidden text-jb-text">
      <style>{`
        @keyframes breathe-massive {
          0%, 100% { opacity: 0.7; transform: scale(1) translateZ(0); }
          50% { opacity: 0.9; transform: scale(1.1) translateZ(0); }
        }
        @keyframes breathe-subtle {
          0%, 100% { opacity: 0.5; transform: scale(1.05) translateZ(0); }
          50% { opacity: 0.8; transform: scale(1) translateZ(0); }
        }
        .animate-breathe-massive { animation: breathe-massive 18s infinite ease-in-out; }
        .animate-breathe-subtle { animation: breathe-subtle 22s infinite ease-in-out; }
      `}</style>
      
      {/* ORGANIC AURA: Ultra High Vibrancy Adaptive Synthesis (V4+ Style) */}
      <AnimatePresence>
        {auraMode === 'organic' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
          >
            {/* Massive Primary Wash: Ultra Magenta/Pink (Left to Center) */}
            <div
              className="animate-breathe-massive absolute top-[-15%] left-[-25%] w-[130%] h-[130%] rounded-full mix-blend-screen blur-[120px] will-change-transform"
              style={{
                background: 'radial-gradient(circle at 35% 50%, rgba(157, 91, 210, 0.7) 0%, rgba(244, 63, 94, 0.55) 30%, transparent 70%)',
              }}
            />

            {/* Massive Secondary Wash: Electric Neon Blue (Right side) */}
            <div
              className="animate-breathe-subtle absolute top-[-10%] right-[-25%] w-[130%] h-[130%] rounded-full mix-blend-screen blur-[130px] will-change-transform"
              style={{
                background: 'radial-gradient(circle at 65% 50%, rgba(60, 113, 247, 0.7) 0%, rgba(6, 182, 212, 0.45) 40%, transparent 70%)',
              }}
            />

            {/* High-Intensity Core: Vibrant Orange Pop */}
            <div
              className="animate-breathe-massive absolute top-[10%] left-[10%] w-[100%] h-[100%] rounded-full mix-blend-screen blur-[140px] will-change-transform"
              style={{
                background: 'radial-gradient(circle at 40% 40%, rgba(251, 146, 60, 0.45) 0%, rgba(244, 63, 94, 0.25) 50%, transparent 70%)',
              }}
            />

            {/* Bottom-Center Warming: Deep Purple/Blue Base */}
            <div
              className="animate-breathe-subtle absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[100%] h-[80%] rounded-full mix-blend-screen blur-[120px] will-change-transform"
              style={{
                background: 'radial-gradient(circle at center, rgba(157, 91, 210, 0.4) 0%, rgba(60, 113, 247, 0.3) 60%, transparent 80%)',
              }}
            />

            {/* Global Noise Texture - Increased for V4 feel */}
            <div className="absolute inset-0 opacity-[0.08] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STATIC AURA: Predictable, fixed resource allocation (Balanced High Vibrancy) */}
      <AnimatePresence>
        {auraMode === 'static' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
          >
            <div 
              className="absolute top-[-5%] left-[-5%] w-[70%] h-[70%] rounded-full opacity-40 blur-[120px]"
              style={{ background: 'radial-gradient(circle, #3C71F7 0%, transparent 70%)' }}
            />
            <div 
              className="absolute bottom-[-5%] right-[-5%] w-[70%] h-[70%] rounded-full opacity-40 blur-[120px]"
              style={{ background: 'radial-gradient(circle, #9D5BD2 0%, transparent 70%)' }}
            />
            <div 
              className="absolute top-[20%] right-[10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[100px]"
              style={{ background: 'radial-gradient(circle, #FB923C 0%, transparent 70%)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* OFF MODE: Absolute minimum resource usage */}
      {auraMode === 'off' && (
        <div className="absolute inset-0 bg-[#020204]" />
      )}

      <div className="relative z-10 w-full h-[100dvh] flex flex-col">
        {children}
      </div>
    </div>
  );
});

export default AuraBackground;