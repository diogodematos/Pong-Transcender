/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./typescript/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores personalizadas para o tema Pong
        'pong': {
          'primary': '#00ff41',
          'secondary': '#ff0080',
          'dark': '#0a0a0a',
          'light': '#ffffff'
        }
      },
      fontFamily: {
        'mono': ['Courier New', 'monospace'],
        'pixel': ['Press Start 2P', 'cursive'] // Para um look retro
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-fast': 'pulse 1s infinite'
      }
    },
  },
  plugins: [],
}
