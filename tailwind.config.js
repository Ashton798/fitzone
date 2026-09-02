/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
    extend: {
      colors: {
        // 电光蓝 - 主品牌色（保留蓝色系）
        primary: {
          50: '#E8F0FF',
          100: '#D3E2FF',
          200: '#A8C5FF',
          300: '#7CA8FF',
          400: '#5886FF',
          500: '#2F6BFF',
          600: '#1D54E8',
          700: '#16409E',
          800: '#10306F',
          900: '#0B2149',
          950: '#0A1A2F',
        },
        // 柠檬黄 - 健身海报撞色
        accent: {
          50: '#FFF9E5',
          100: '#FFF1C2',
          200: '#FFE48A',
          300: '#FFD65C',
          400: '#FFCF45',
          500: '#FFC93C',
          600: '#E6A900',
          700: '#B8860B',
          800: '#8A6508',
          900: '#5C4405',
        },
        // 深海军蓝 - 页面深色
        dark: {
          50: '#FFFFFF',
          100: '#F4F6FA',
          200: '#E9EDF4',
          300: '#D4DCE8',
          400: '#A9BCD4',
          500: '#7A8AA6',
          600: '#4C5F80',
          700: '#2B3D5C',
          800: '#16233B',
          900: '#0D1A30',
          950: '#0A1A2F',
        },
        // 活力色
        vibe: {
          blue: '#2F6BFF',
          red: '#FF4D4D',
          yellow: '#FFC93C',
          green: '#2FD673',
          purple: '#9D6BFF',
          pink: '#FF6B9D',
          orange: '#FF9A3C',
          teal: '#2EC4B6',
        },
      },
      fontFamily: {
        display: ['"ZCOOL KuaiLe"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        body: ['-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Microsoft YaHei"', '"Segoe UI"', 'sans-serif'],
        anton: ['Anton', '"ZCOOL KuaiLe"', 'sans-serif'],
        hand: ['Caveat', 'cursive'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '26px',
        '4xl': '36px',
      },
      boxShadow: {
        'sport': '4px 4px 0 rgba(10, 26, 47, 0.12)',
        'sport-lg': '6px 8px 0 rgba(47, 107, 255, 0.25)',
        'sport-blue': '4px 4px 0 rgba(47, 107, 255, 0.3)',
        'elevation-1': '0 2px 8px rgba(10, 26, 47, 0.08)',
        'elevation-2': '0 4px 14px rgba(10, 26, 47, 0.1)',
        'elevation-3': '0 8px 24px rgba(10, 26, 47, 0.12)',
        'elevation-4': '0 12px 32px rgba(10, 26, 47, 0.16)',
        'elevation-5': '0 16px 40px rgba(10, 26, 47, 0.2)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-down': 'slideDown 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fadeIn 0.6s ease-out',
        'pop-in': 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spin-slow': 'spin 12s linear infinite',
        'wobble': 'wobble 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'count-up': 'countUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(-3deg)' },
          '50%': { transform: 'translateY(-14px) rotate(3deg)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px) rotate(0.5deg)' },
          '100%': { opacity: '1', transform: 'translateY(0) rotate(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.9) rotate(-2deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0)' },
        },
        wobble: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
