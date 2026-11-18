import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === 'analyze' ? [visualizer({ filename: 'stats.html', gzipSize: true, brotliSize: true })] : []),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-data': ['@tanstack/react-query', '@tanstack/react-table', 'axios', 'zustand'],
          'vendor-ui': [
            '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select',
            '@radix-ui/react-toast', 'lucide-react', 'sonner',
          ],
          // Cada librería de Excel en su paquete: se descargan solo al generar un archivo
          'vendor-exceljs': ['exceljs'],
          'vendor-xlsx': ['xlsx'],
          'vendor-qr': ['html5-qrcode', 'qrcode'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
}));
