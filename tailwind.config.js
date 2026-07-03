/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#050816',
        midnight: '#0b1020',
        aurora: '#7c3aed',
        electric: '#38bdf8',
      },
      boxShadow: {
        glow: '0 24px 80px rgba(124, 58, 237, 0.22)',
      },
    },
  },
  plugins: [],
};
