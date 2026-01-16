import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const AuraBackground = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-jb-dark text-jb-text">
      
      {/* Dynamic Fluid Blobs - Multi-layered */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none scale-110">
        
        {/* Layer 1: Orange Warmth */}
        <motion.div
          animate={{
            x: [-100, 100, -50],
            y: [-50, 50, 100],
            scale: [1, 1.2, 0.9],
            rotate: [0, 45, -45],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[5%] w-[700px] h-[700px] bg-jb-orange/15 rounded-full blur-[140px] mix-blend-screen"
        />

        {/* Layer 2: Cyber Pink */}
        <motion.div
          animate={{
            x: [200, -100, 50],
            y: [100, -150, 0],
            scale: [1.1, 0.8, 1.2],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[20%] right-[10%] w-[600px] h-[600px] bg-jb-pink/10 rounded-full blur-[120px] mix-blend-screen"
        />

        {/* Layer 3: Deep Blue/Purple Core */}
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] left-[30%] w-[800px] h-[800px] bg-jb-accent/10 rounded-full blur-[160px] mix-blend-screen"
        />
        
        {/* Fine Grain overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] contrast-150 brightness-100"></div>
      </div>

      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};