import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  build: {
    outDir: 'dist-share',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, './share.html'),
    },
  },
})
