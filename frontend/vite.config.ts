import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Environment variables for configuration
const usePolling = process.env.VITE_USE_POLLING === 'true';
const disableWs = process.env.VITE_DISABLE_WS === 'true';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/', // Use env variable or default to root
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: disableWs ? false : {
      // Configure HMR for Docker networking
      protocol: 'ws',
      // Don't use 0.0.0.0 as browsers block this address
      host: 'localhost',
      port: 5173,
      // Disable host check for Docker networking
      clientPort: 5173,
      // Always show overlay for better debugging
      overlay: true,
    },
    watch: {
      // Use polling for file changes to fix Docker issues
      usePolling: usePolling, 
      interval: 1000,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://backend:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});