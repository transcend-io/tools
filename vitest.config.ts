import { defineConfig } from 'vitest/config';

const sourceConditions = ['@transcend-io/source'];

export default defineConfig({
  resolve: {
    conditions: sourceConditions,
  },
  ssr: {
    resolve: {
      conditions: sourceConditions,
    },
  },
  test: {
    coverage: {
      exclude: ['**/*.test.ts', '**/dist/**'],
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
    environment: 'node',
    globals: true,
    passWithNoTests: true,
  },
});
