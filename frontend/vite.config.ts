import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Helper to check for cert files
const certPath = path.resolve(__dirname, '../.cert');
const keyPath = path.resolve(certPath, 'key.pem');
const certFilePath = path.resolve(certPath, 'cert.pem');
const certsExist = fs.existsSync(keyPath) && fs.existsSync(certFilePath);

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Conditionally enable HTTPS only if certs exist
    https: certsExist
      ? {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certFilePath),
        }
      : undefined,
    hmr: process.env.VITE_DISABLE_WS === 'true' ? false : {
      host: 'localhost',
      protocol: 'ws',
      timeout: 10000,
    },
    watch: {
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      '/api': {
        target: 'https://backend:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('VITE_PROXY: Proxy error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('VITE_PROXY: Sending API Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('VITE_PROXY: Received API Response:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    sourcemap: process.env.NODE_ENV !== 'production',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios'],
    force: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});