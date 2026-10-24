import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
    restoreMocks: false,
    // Algunas pruebas dibujan la aplicación completa y simulan decenas de pulsaciones: en equipos
    // más lentos (Windows con antivirus, por ejemplo) necesitan más de los 5 segundos por defecto.
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
