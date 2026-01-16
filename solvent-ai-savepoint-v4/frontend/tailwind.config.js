/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jb: {
          dark: '#020205',      // Deepest black for contrast
          panel: '#0A0B10',     
          hover: '#12141C',     
          border: '#1E202A',    
          text: '#C0C2C8',      
          accent: '#3C71F7',    // Electric Blue
          purple: '#9D5BD2',    // Deep Purple
          pink: '#F43F5E',      // Vibrant Rose/Pink
          orange: '#FB923C',    // Soft Neon Orange
          cyan: '#06B6D4',      
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      animation: {
        'blob': 'blob 25s infinite',
        'slow-spin': 'spin 40s linear infinite',
        'border-flow': 'border-flow 4s linear infinite',
      },
      keyframes: {
        blob: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(60px, -80px) scale(1.15)' },
          '66%': { transform: 'translate(-40px, 40px) scale(0.9)' },
        },
        'border-flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
