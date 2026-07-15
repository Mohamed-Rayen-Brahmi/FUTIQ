/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          base: '#0a0e14',
          panel: '#121a22',
          deep: '#0d141a',
          border: '#1e2a36',
        },
        gold: {
          DEFAULT: '#d8b458',
          light: '#e8c878',
          dark: '#a8843c',
        },
        cta: {
          DEFAULT: '#ff5b3d',
          light: '#ff7a5e',
          dark: '#cc3a20',
        },
        match: {
          green: '#2ecc71',
          amber: '#f1a524',
          gray: '#4a5560',
        },
      },
      fontFamily: {
        display: ['Teko', 'sans-serif'],
        label: ['Rajdhani', 'sans-serif'],
        body: ['Barlow', 'sans-serif'],
      },
      animation: {
        'foil-sweep': 'foil-sweep 0.8s ease-out',
        'row-in': 'row-in 0.3s ease-out',
        'cell-flip': 'cell-flip 0.4s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
      },
      keyframes: {
        'foil-sweep': {
          '0%': { transform: 'translateX(-150%) rotate(20deg)' },
          '100%': { transform: 'translateX(150%) rotate(20deg)' },
        },
        'row-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'cell-flip': {
          '0%': { transform: 'scaleY(0)' },
          '50%': { transform: 'scaleY(1.05)' },
          '100%': { transform: 'scaleY(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
