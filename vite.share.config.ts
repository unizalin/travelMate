import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { defineConfig } from 'vite'

function publicModuleGraphPlugin(root: string) {
  return {
    name: 'tripbook-public-module-graph',
    generateBundle(_options: unknown, bundle: Record<string, { type: string; modules?: Record<string, unknown> }>) {
      const modules = new Set<string>()
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk' || !output.modules) continue
        for (const moduleId of Object.keys(output.modules)) {
          if (moduleId.startsWith('\0')) continue
          const relative = path.relative(root, moduleId).replaceAll(path.sep, '/')
          if (relative.startsWith('../') || relative === '..') {
            throw new Error(`Public module graph contains a module outside the project root: ${moduleId}`)
          }
          if (relative) modules.add(relative)
        }
      }
      this.emitFile({
        type: 'asset',
        fileName: 'public-module-graph.json',
        source: JSON.stringify({ version: 1, modules: [...modules].sort() }, null, 2),
      })
    },
  }
}

const projectRoot = path.resolve(__dirname)

export default defineConfig({
  plugins: [vue(), publicModuleGraphPlugin(projectRoot)],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  build: {
    outDir: 'dist-share',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: path.resolve(__dirname, './share.html'),
    },
  },
})
