import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import themePlugin from '@replit/vite-plugin-shadcn-theme-json';
import path from 'path';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';
import { offlinePlugin } from './scripts/offline-plugin';
import { e2eNetworkGate } from './scripts/lib/e2e-network-gate';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  define: {
    'import.meta.env.VITE_COMPACT_CATALOGUE': JSON.stringify(
      process.env.VITE_COMPACT_CATALOGUE ?? '0',
    ),
  },
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    themePlugin(),
    offlinePlugin(process.env.VITE_COMPACT_CATALOGUE === '1'),
    ...(process.env.POKEMONPEDIA_E2E_NETWORK_GATE
      ? [e2eNetworkGate(process.env.POKEMONPEDIA_E2E_NETWORK_GATE)]
      : []),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client', 'src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
      '@assets': path.resolve(import.meta.dirname, 'attached_assets'),
    },
  },
  root: path.resolve(import.meta.dirname, 'client'),
  server: { watch: { ignored: ['**/.staging-*/**'] } },
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
});
