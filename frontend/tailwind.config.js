/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Government of India official colors
        govBlue: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#1A3A6B',
          600: '#153268',
          700: '#0F2356',
          800: '#0A1740',
          900: '#060E28',
          DEFAULT: '#1A3A6B',
        },
        saffron: {
          400: '#FF9933',
          500: '#FF8C00',
          600: '#E67E00',
          DEFAULT: '#FF9933',
        },
        govGreen: {
          400: '#138808',
          500: '#0D6E04',
          600: '#0A5703',
          DEFAULT: '#138808',
        },
        ashoka: {
          blue: '#00008B',
          DEFAULT: '#1A3A6B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans', 'system-ui', 'sans-serif'],
        devanagari: ['Noto Sans Devanagari', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      }
    },
  },
  plugins: [],
}
