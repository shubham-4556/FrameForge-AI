import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1.25rem', sm: '1.5rem', lg: '2rem' },
      screens: { '2xl': '1320px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        surface: {
          DEFAULT: 'hsl(var(--surface-1))',
          raised: 'hsl(var(--surface-2))',
          overlay: 'hsl(var(--surface-3))',
        },
        line: {
          DEFAULT: 'hsl(var(--border))',
          strong: 'hsl(var(--border-strong))',
        },
        ink: {
          DEFAULT: 'hsl(var(--foreground))',
          muted: 'hsl(var(--muted-foreground))',
          faint: 'hsl(var(--faint))',
        },
        brand: {
          DEFAULT: 'hsl(var(--brand))',
          bright: 'hsl(var(--brand-bright))',
          deep: 'hsl(var(--brand-deep))',
        },
        magenta: 'hsl(var(--magenta))',
        cyan: 'hsl(var(--cyan))',
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        danger: 'hsl(var(--danger))',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
        display: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        serif: ['Iowan Old Style', 'Palatino Linotype', 'Georgia', 'serif'],
      },
      letterSpacing: {
        tightest: '-0.045em',
        editorial: '-0.03em',
      },
      borderRadius: {
        xl: '0.85rem',
        '2xl': '1.15rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        glow: '0 0 80px -20px hsl(var(--brand) / 0.45)',
        panel: '0 24px 80px -40px rgba(0, 0, 0, 0.75)',
        lift: '0 18px 50px -30px rgba(0, 0, 0, 0.55)',
        ring: 'inset 0 1px 0 0 hsl(var(--foreground) / 0.06)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(ellipse 70% 55% at 50% -10%, hsl(var(--brand) / 0.22), transparent 72%)',
        'accent-line':
          'linear-gradient(90deg, transparent, hsl(var(--brand) / 0.8), transparent)',
        'panel-sheen':
          'linear-gradient(135deg, hsl(var(--foreground) / 0.05), transparent 42%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-700px 0' },
          '100%': { backgroundPosition: '700px 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '1' },
        },
        'scan-line': {
          '0%': { transform: 'translateX(-40%)' },
          '100%': { transform: 'translateX(140%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'marquee-left': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'border-spin': {
          '100%': { transform: 'rotate(1turn)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.8s linear infinite',
        'pulse-soft': 'pulse-soft 2.6s ease-in-out infinite',
        'scan-line': 'scan-line 4s ease-in-out infinite',
        float: 'float 7s ease-in-out infinite',
        marquee: 'marquee-left 36s linear infinite',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
