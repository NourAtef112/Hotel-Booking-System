import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#B30000',
        'primary-dark': '#8B0000',
        'primary-glow': 'rgba(179,0,0,0.25)',
        surface: 'rgba(255,255,255,0.04)',
        'surface-hover': 'rgba(255,255,255,0.07)',
        border: 'rgba(255,255,255,0.07)',
      },
      backgroundImage: {
        'radial-red': 'radial-gradient(ellipse 60% 40% at 70% 10%, rgba(179,0,0,0.18) 0%, transparent 70%)',
        'radial-subtle': 'radial-gradient(ellipse 80% 60% at 20% 80%, rgba(179,0,0,0.07) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-red': '0 0 40px rgba(179,0,0,0.3)',
        'glow-sm': '0 0 20px rgba(179,0,0,0.15)',
        glass: '0 8px 32px rgba(0,0,0,0.4)',
        float: '0 20px 40px rgba(0,0,0,0.5)',
      },
      animation: {
        'slide-up':   'slideUp 0.55s cubic-bezier(0.16,1,0.3,1) both',
        'slide-up-fast': 'slideUpFast 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in':    'fadeIn 0.4s ease-out both',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'shimmer':    'shimmerSlide 3s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
