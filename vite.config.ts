import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Quan trọng cho Electron để load file tĩnh đúng đường dẫn
  server: {
    port: 5173,
    strictPort: true,
  }
});