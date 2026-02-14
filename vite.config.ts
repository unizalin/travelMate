import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
import { templateCompilerOptions } from '@tresjs/core'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('Tres') && tag !== 'TresCanvas'
        }
      }
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  optimizeDeps: {
    include: ['leaflet']
  }
})
