import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.jpg', 'icons/*.webp'],
      manifest: {
        name: 'Yoogi Money Tracker',
        short_name: 'Yoogi',
        description: 'Quản lý thu chi hằng ngày • AI phân loại tự động',
        theme_color: '#ffffff',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: 'logo.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 3000
  }
})
