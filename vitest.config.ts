import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['@transcend-io/source'],
  },
  test: {
    coverage: {
      exclude: ['**/*.test.ts', '**/dist/**'],
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
    environment: 'node',
    globals: true,
  },
});
