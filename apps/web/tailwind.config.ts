import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1.25rem', lg: '2rem' },
      screens: { '2xl': '1280px' },
    },
    extend: {
      colors: {
        canvas: '#07080b',
        surface: {
          DEFAULT: '#0c0e13',
          raised: '#11141b',
          overlay: '#171a22',
        },
        line: {
          DEFAULT: '#1d212b',
          strong: '#2a303d',
        },
        ink: {
          DEFAULT: '#f2f3f7',
          muted: '#9ba3b4',
          faint: '#687084',
        },
        accent: {
          DEFAULT: '#7c5cff',
          bright: '#9a80ff',
          dim: '#5a3fe0',
        },
        cyan: '#52d6ff',
        success: '#46d39a',
        warning: '#f7b955',
        danger: '#ff6b6b',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.15rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        glow: '0 0 60px rgba(124, 92, 255, 0.18)',
        panel: '0 20px 60px -30px rgba(0, 0, 0, 0.85)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(124,92,255,0.16), transparent 70%)',
        'accent-line': 'linear-gradient(90deg, transparent, rgba(124,92,255,0.7), transparent)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-700px 0' },
          '100%': { backgroundPosition: '700px 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        'scan-line': {
          '0%': { transform: 'translateX(-30%)' },
          '100%': { transform: 'translateX(130%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'scan-line': 'scan-line 3.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
