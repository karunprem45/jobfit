import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this repo at /jobfit/, so assets need that prefix.
// Docker and local dev serve from the root, hence the env switch.
const base = process.env.PAGES_BASE || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' },
    // shared/ lives outside the Vite root; allow reading it.
    fs: { allow: ['..'] },
  },
});
