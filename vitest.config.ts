import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const sourceConditions = ['@transcend-io/source'];
const toolsAssetsAlias = {
  '@tools/assets': path.join(repoRoot, 'assets'),
};

export default defineConfig({
  resolve: {
    alias: toolsAssetsAlias,
    conditions: sourceConditions,
  },
  ssr: {
    resolve: {
      alias: toolsAssetsAlias,
      conditions: sourceConditions,
    },
  },
  plugins: [
    {
      name: 'svg-text-loader',
      load(id) {
        if (id.endsWith('.svg')) {
          return `export default ${JSON.stringify(readFileSync(id, 'utf8'))}`;
        }
      },
    },
  ],
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
