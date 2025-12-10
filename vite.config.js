import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
    port: 3000,
    open: true
  }
})
