import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Изолированный тест-раннер для чистой логики приложения.
// Тестируем чистую логику приложения; алиас @ совпадает с tsconfig paths.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
});
