import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { theme } from './src/theme';

// Relative base so the same build works at https://<user>.github.io/<repo>/
// and on localhost. Routing is hash-based (#/display, #/control), so no
// server rewrites are needed on GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg'],
      manifest: {
        name: theme.title,
        short_name: theme.shortName,
        description: theme.subtitle,
        // Opens the home chooser; App reopens whichever view this install was used for.
        start_url: './',
        scope: './',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        background_color: theme.colors.bg,
        theme_color: theme.colors.bg,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell and fonts so the TV still loads on flaky party Wi-Fi.
        globPatterns: ['**/*.{js,css,html,woff,woff2,png,svg}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
});
