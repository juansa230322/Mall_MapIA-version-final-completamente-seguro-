import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// La interfaz vive en client/ y se compila en dist/ (Express la sirve con npm start).
export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: {
    port: 5173,
    // En desarrollo (npm run dev:web) las llamadas /api van al servidor Express.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
