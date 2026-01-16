import React, { memo } from 'react';

export const AuraBackground = memo(({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#020205] text-jb-text">
      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.4; transform: scale(1) translateZ(0); }
          50% { opacity: 0.6; transform: scale(1.05) translateZ(0); }
        }
        @keyframes breathe-slow {
          0%, 100% { opacity: 0.3; transform: scale(1.05) translateZ(0); }
          50% { opacity: 0.5; transform: scale(1) translateZ(0); }
        }
        @keyframes breathe-point {
          0%, 100% { opacity: 0.5; transform: scale(0.9) translateZ(0); }
          50% { opacity: 0.8; transform: scale(1.1) translateZ(0); }
        }
        .animate-breathe { animation: breathe 12s infinite ease-in-out; }
        .animate-breathe-slow { animation: breathe-slow 15s infinite ease-in-out; }
        .animate-breathe-point { animation: breathe-point 8s infinite ease-in-out; }
        .animate-breathe-point-delayed { animation: breathe-point 10s infinite ease-in-out 2s; }
      `}</style>
      
      {/* CSS-Animated Atmospheric Glows */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        
        {/* Atmos 1: Orange/Rose */}
        <div
          className="animate-breathe absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] rounded-full mix-blend-screen blur-[60px] will-change-transform"
          style={{
            background: 'radial-gradient(circle at center, rgba(251, 146, 60, 0.4) 0%, rgba(244, 63, 94, 0.2) 50%, transparent 70%)',
          }}
        />

        {/* Atmos 2: Blue/Cyan */}
        <div
          className="animate-breathe-slow absolute bottom-[-20%] right-[-10%] w-[1100px] h-[1100px] rounded-full mix-blend-screen blur-[70px] will-change-transform"
          style={{
            background: 'radial-gradient(circle at center, rgba(60, 113, 247, 0.3) 0%, rgba(6, 182, 212, 0.1) 60%, transparent 70%)',
          }}
        />

        {/* Glow Points */}
        <div
          className="animate-breathe-point absolute top-[15%] left-[20%] w-80 h-80 rounded-full mix-blend-screen blur-[40px] will-change-transform"
          style={{ background: 'radial-gradient(circle, rgba(251, 146, 60, 0.4), transparent 70%)' }}
        />

        <div
          className="animate-breathe-point-delayed absolute bottom-[25%] left-[15%] w-[450px] h-[450px] rounded-full mix-blend-screen blur-[50px] will-change-transform"
          style={{ background: 'radial-gradient(circle, rgba(60, 113, 247, 0.3), transparent 70%)' }}
        />

        <div
          className="animate-breathe-point absolute top-[10%] right-[25%] w-72 h-72 rounded-full mix-blend-screen blur-[40px] will-change-transform"
          style={{ background: 'radial-gradient(circle, rgba(244, 63, 94, 0.4), transparent 70%)' }}
        />

        {/* Global Noise Texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
});