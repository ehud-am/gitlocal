import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.GITLOCAL_PORT ?? 8742}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('/node_modules/react-markdown/')
            || id.includes('/node_modules/remark-gfm/')
            || id.includes('/node_modules/rehype-highlight/')
          ) {
            return 'markdown'
          }
        },
      },
    },
  },
})
