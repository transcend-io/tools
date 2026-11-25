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
      // Mirrors the `loader` entries in tsdown.config.base.ts so tests resolve
      // these imports the same way the published bundles do.
      name: 'text-asset-loader',
      load(id) {
        if (id.endsWith('.svg') || id.endsWith('.html') || id.endsWith('.md')) {
          return `export default ${JSON.stringify(readFileSync(id, 'utf8'))}`;
        }
      },
    },
  ],
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/.worktrees/**'],
    coverage: {
      exclude: ['**/*.test.ts', '**/dist/**'],
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
    // Opt MCP test-only URL overrides on for the suite; production/runtime stays off unless set.
    // Force a colorless terminal so `colors` assertions stay stable under FORCE_COLOR=1 shells.
    env: {
      ALLOW_TEST_OVERRIDES: '1',
      FORCE_COLOR: '0',
      NO_COLOR: '1',
    },
    environment: 'node',
    globals: true,
  },
});
