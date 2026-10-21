import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig, type Plugin } from 'vite'
import { templateCompilerOptions } from '@tresjs/core'

function offlineManifest(): Plugin { return {name:'tripbook-offline-assets',generateBundle(_options,bundle){this.emitFile({type:'asset',fileName:'offline-assets.json',source:JSON.stringify(['/',...Object.keys(bundle).filter(name=>name.startsWith('assets/')).map(name=>`/${name}`)])})}} }
export default defineConfig({
  plugins: [
    offlineManifest(),
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
    proxy: {
      '/api/aurora-notifications': 'http://127.0.0.1:8788',
      '/api/vedur-alerts': {
        target: 'https://en.vedur.is',
        changeOrigin: true,
        rewrite: () => '/xhrreq?req=alert',
      },
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  optimizeDeps: {
    include: ['leaflet']
  }
})
