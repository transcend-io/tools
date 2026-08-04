import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { TEXT_ASSET_EXTENSIONS } from './tsdown.config.base.ts';

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
      // Shares the extension list with tsdown.config.base.ts so tests resolve
      // these imports the same way the published bundles do.
      name: 'text-asset-loader',
      load(id) {
        if (TEXT_ASSET_EXTENSIONS.some((extension) => id.endsWith(extension))) {
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
