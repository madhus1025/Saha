import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://localhost:7001',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'https://localhost:7001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router'],
          query: ['@tanstack/react-query'],
          ui: ['framer-motion', 'lucide-react'],
          forms: ['react-hook-form', 'zod', '@hookform/resolvers'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-utils/setup.ts'],
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/app/test-setup.ts', '**/*.d.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
})
