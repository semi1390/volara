import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        profit: '#10B981',
        danger: '#EF4444',
        background: '#0F0F1A',
        card: '#1A1A2E',
        'border-subtle': 'rgba(255,255,255,0.08)',
        'text-primary': '#FFFFFF',
        'text-secondary': '#9CA3AF',
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': 'radial-gradient(rgba(99,102,241,0.15) 1px, transparent 1px)',
        'hero-gradient': 'radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.2) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid': '30px 30px',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'count-up': 'countUp 0.5s ease-out',
        'flicker': 'flicker 0.1s ease-in-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        countUp: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
      boxShadow: {
        'glow-indigo': '0 0 20px rgba(99,102,241,0.35)',
        'glow-green': '0 0 20px rgba(16,185,129,0.25)',
        'glow-red': '0 0 20px rgba(239,68,68,0.25)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
      },
      borderRadius: {
        'xl2': '20px',
      },
    },
  },
  plugins: [],
}
export default config
