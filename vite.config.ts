import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Rutas relativas en el build: el juego funciona igual en la raíz de un dominio
  // o en una subcarpeta (por ejemplo, una vista previa de Vercel).
  base: './',
  build: {
    target: 'es2022',
    // Carpeta del código compilado. No se llama 'assets' para no mezclarse con public/assets.
    assetsDir: 'build',
    // Solo index.html se publica; herramientas/ queda fuera del build.
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
