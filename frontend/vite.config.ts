import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Mock data configuration:
// This app supports running with mock data when backend services are unavailable.
// To enable mock data mode, set these environment variables:
// - VITE_ENABLE_DEV_FALLBACKS=true
// - VITE_MOCK_DATA=true
// 
// Or set window.FORCE_DEV_FALLBACKS = true in index.html (already implemented)
// 
// The service switcher in src/services/index.ts will automatically choose 
// between real and mock implementations based on these settings.
//
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/', // Use env variable or default to root
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Handle HMR based on environment variable
    hmr: process.env.VITE_DISABLE_WS === 'true' ? false : {
      // Use explicit protocol and host
      host: 'localhost',
      protocol: 'ws',
      timeout: 10000,
    },
    // Use a more stable file watching configuration
    watch: {
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path,
        // Configure with better timeout and error handling
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error, will retry automatically:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending API Request:', req.method, req.url);
            console.log('Proxy target:', 'http://backend:8000' + req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received API Response:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  // Optimize build performance
  build: {
    chunkSizeWarningLimit: 1000,
    sourcemap: process.env.NODE_ENV !== 'production',
  },
  // Optimize dependency handling
  optimizeDeps: {
    // Explicitly include dependencies that might cause issues
    include: ['react', 'react-dom', 'react-router-dom', 'axios'],
    // Don't force optimization in development for better stability
    force: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});