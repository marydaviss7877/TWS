/** @type {import('tailwindcss').Config} */
const { brand } = require('./src/design/tokens');

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Geist', '-apple-system', 'Segoe UI', 'sans-serif'],
        'heading': ['Geist', '-apple-system', 'Segoe UI', 'sans-serif'],
        'mono': ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'monospace'],
      },
      colors: {
        // TWS Brand Color Palette — sourced from frontend/src/design/tokens.js.
        // Never hand-edit these values here; edit tokens.js instead.
        primary: brand.navy,
        secondary: brand.green,
        accent: brand.orange,
        // Glassmorphism Dark Mode Colors
        'glass-dark': {
          deepest: '#050711',
          deep: '#0A0E27',
          base: '#1A1F3A',
          light: '#2A2F4A',
        },
        // Near-Black Variants
        'near-black': {
          darkest: '#050711',
          dark: '#0A0A0A',
          base: '#111111',
          light: '#1A1A1A',
        },
        // Clean Light Mode Colors
        'clean-light': {
          pure: '#FFFFFF',
          soft: '#FAFAFA',
          subtle: '#F5F5F5',
          border: '#E5E5E5',
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '40px',
        '3xl': '64px',
        '4xl': '72px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(99, 102, 241, 0.3)',
        'glow-lg': '0 0 30px rgba(99, 102, 241, 0.4)',
        'glow-xl': '0 0 40px rgba(99, 102, 241, 0.5)',
        'inner-glow': 'inset 0 0 20px rgba(99, 102, 241, 0.1)',
        // Premium Glassmorphism Shadows
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glass-lg': '0 10px 40px 0 rgba(31, 38, 135, 0.25)',
        'glass-xl': '0 15px 50px 0 rgba(31, 38, 135, 0.35)',
        // Dark Mode Enhanced Shadows
        'dark-glass': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
        'dark-glass-lg': '0 10px 40px 0 rgba(0, 0, 0, 0.6)',
        'dark-glass-xl': '0 15px 50px 0 rgba(0, 0, 0, 0.7)',
        // Premium Depth Shadows
        'depth-sm': '0 2px 8px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.04)',
        'depth': '0 4px 16px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.08)',
        'depth-lg': '0 8px 24px rgba(0, 0, 0, 0.12), 0 16px 48px rgba(0, 0, 0, 0.12)',
      },
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
        '4xl': '2560px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-in-fast': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'bounce-in': 'bounceIn 0.6s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
        'glow-slow': 'glow 3s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'float-slow': 'float 4s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'scale-in': 'scaleIn 0.3s ease-out',
        'rotate-in': 'rotateIn 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        rotateIn: {
          '0%': { transform: 'rotate(-180deg) scale(0)', opacity: '0' },
          '100%': { transform: 'rotate(0deg) scale(1)', opacity: '1' },
        },
      },
      backdropBlur: {
        'xs': '2px',
      },
      // Premium Glassmorphism Opacity Values
      opacity: {
        '2': '0.02',
        '3': '0.03',
        '85': '0.85',
        '90': '0.90',
        '92': '0.92',
        '95': '0.95',
        '98': '0.98',
      },
      // Enhanced Transition Timing
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [
    // Hide scrollbar but keep scrollability (used by sub-nav tabs, AppGrid)
    function ({ addUtilities }) {
      addUtilities({
        '.no-scrollbar::-webkit-scrollbar': { display: 'none' },
        '.no-scrollbar': { '-ms-overflow-style': 'none', 'scrollbar-width': 'none' },
      });
    },
  ],
}
