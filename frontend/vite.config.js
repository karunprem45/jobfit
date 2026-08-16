import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In local dev, forward /api to the backend so the frontend code
    // can always just call "/api" regardless of environment.
    proxy: { '/api': 'http://localhost:3001' },
  },
});
