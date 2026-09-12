import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    root: './',
  },
  plugins: [
    // O SWC compila os decoradores do NestJS que o esbuild do Vitest nao entende.
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
