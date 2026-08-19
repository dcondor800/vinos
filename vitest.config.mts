import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Mismo alias que tsconfig.json, para que los tests importen como la app.
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    // Solo lógica pura. Las pantallas se prueban en el navegador.
    include: ['lib/**/*.test.ts'],
  },
});
