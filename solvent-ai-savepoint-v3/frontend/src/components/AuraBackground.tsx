import React, { memo } from 'react';

export const AuraBackground = memo(({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#020205] text-jb-text">
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
      
      {/* CSS-Animated High-Vibrancy Atmospheric Glows */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        
        {/* Massive Primary Wash: Ultra Magenta/Pink (Left to Center) */}
        <div
          className="animate-breathe-massive absolute top-[-15%] left-[-25%] w-[130%] h-[130%] rounded-full mix-blend-screen blur-[120px] will-change-transform"
          style={{
            background: 'radial-gradient(circle at 35% 50%, rgba(157, 91, 210, 0.6) 0%, rgba(244, 63, 94, 0.45) 30%, transparent 70%)',
          }}
        />

        {/* Massive Secondary Wash: Electric Neon Blue (Right side) */}
        <div
          className="animate-breathe-subtle absolute top-[-10%] right-[-25%] w-[130%] h-[130%] rounded-full mix-blend-screen blur-[130px] will-change-transform"
          style={{
            background: 'radial-gradient(circle at 65% 50%, rgba(60, 113, 247, 0.6) 0%, rgba(6, 182, 212, 0.35) 40%, transparent 70%)',
          }}
        />

        {/* High-Intensity Core: Vibrant Orange Pop */}
        <div
          className="animate-breathe-massive absolute top-[10%] left-[10%] w-[100%] h-[100%] rounded-full mix-blend-screen blur-[140px] will-change-transform"
          style={{
            background: 'radial-gradient(circle at 40% 40%, rgba(251, 146, 60, 0.35) 0%, rgba(244, 63, 94, 0.2) 50%, transparent 70%)',
          }}
        />

        {/* Bottom-Center Warming: Deep Purple/Blue Base */}
        <div
          className="animate-breathe-subtle absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[100%] h-[80%] rounded-full mix-blend-screen blur-[120px] will-change-transform"
          style={{
            background: 'radial-gradient(circle at center, rgba(157, 91, 210, 0.3) 0%, rgba(60, 113, 247, 0.2) 60%, transparent 80%)',
          }}
        />

        {/* Global Noise Texture */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
});