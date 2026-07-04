/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        bebas: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        marker: ['"Permanent Marker"', 'cursive'],
        grotesk: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      colors: {
        concrete:  '#111111',
        offblack:  '#1A1A1A',
        spray:     '#F5E642',
        magenta:   '#FF2D78',
        neon:      '#00F5FF',
        lime:      '#A8FF3E',
        chalk:     'rgba(255,255,255,0.14)',
        chalkhover:'rgba(255,255,255,0.22)',
        // keep these for game states that already use them
        emerald: { 400: '#34D399', 500: '#10B981' },
        rose:    { 400: '#FB7185', 500: '#F43F5E' },
        amber:   { 400: '#FBBF24', 500: '#F59E0B' },
        violet:  { 400: '#A78BFA', 500: '#8B5CF6' },
      },
      boxShadow: {
        spray:    '4px 4px 0 #F5E642',
        'spray-sm':'2px 2px 0 #F5E642',
        magenta:  '4px 4px 0 #FF2D78',
        neon:     '4px 4px 0 #00F5FF',
        inset:    'inset 0 0 0 2px rgba(255,255,255,0.14)',
      },
      animation: {
        'jitter': 'jitter 0.15s ease-in-out infinite',
        'pop-in': 'popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
        'slide-up': 'slideUp 0.3s ease-out both',
        'float': 'float 4s ease-in-out infinite',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        jitter: {
          '0%,100%': { transform: 'rotate(-1deg)' },
          '50%':     { transform: 'rotate(1deg)' },
        },
        popIn: {
          '0%':   { transform: 'scale(0.7)', opacity: '0' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        blink: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
