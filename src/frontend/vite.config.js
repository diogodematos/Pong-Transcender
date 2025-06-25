import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // Configuração de desenvolvimento
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: ['pokepong.42.fr', 'localhost'],
    proxy: {
      // Proxy para API do backend
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Proxy para uploads
      '/uploads': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },

  // Configuração de build
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },

  // Aliases para imports mais limpos
  resolve: {
    alias: {
      '@': resolve(__dirname, './typescript'),
      '@assets': resolve(__dirname, './assets')
    }
  },

  // Configuração CSS
  css: {
    postcss: './postcss.config.js'
  }
})
