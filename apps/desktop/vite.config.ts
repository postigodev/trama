import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@trama/core': new URL('../../packages/core/src', import.meta.url).pathname,
      '@trama/db': new URL('../../packages/db/src', import.meta.url).pathname,
      '@trama/demo-fixtures': new URL(
        '../../packages/demo-fixtures/src',
        import.meta.url
      ).pathname,
      '@trama/shared': new URL('../../packages/shared/src', import.meta.url)
        .pathname,
      '@trama/spotify-adapter': new URL(
        '../../packages/spotify-adapter/src',
        import.meta.url
      ).pathname,
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2020', 'chrome105', 'safari13'],
    minify: process.env.TAURI_DEBUG ? false : 'esbuild',
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
