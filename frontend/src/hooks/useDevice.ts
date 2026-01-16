import { useState, useEffect, useMemo } from 'react';

interface WindowSize {
  width: number;
  height: number;
}

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  windowSize: WindowSize;
}

export function useDevice(): DeviceInfo {
  const [state, setState] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
    windowSize: {
      width: typeof window !== 'undefined' ? window.innerWidth : 0,
      height: typeof window !== 'undefined' ? window.innerHeight : 0,
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const mobile = width < 768;
      const tablet = width >= 768 && width < 1024;
      const desktop = width >= 1024;

      setState({
        isMobile: mobile,
        isTablet: tablet,
        isDesktop: desktop,
        windowSize: { width, height }
      });
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return useMemo(() => state, [state]);
}
