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
      // these imports the same way the published bundles do. `enforce: 'pre'`
      // and stripping Vite's `?import` suffix are required — otherwise the
      // default asset plugin wins and `.svg` becomes a data URI. Skip `?react`
      // (SVGR) and `?url`.
      name: 'text-asset-loader',
      enforce: 'pre',
      load(id) {
        const filePath = id.split(/[?#]/, 1)[0] ?? id;
        if (id.includes('?url') || id.includes('?react')) return undefined;
        if (filePath.endsWith('.svg') || filePath.endsWith('.html')) {
          return `export default ${JSON.stringify(readFileSync(filePath, 'utf8'))}`;
        }
        return undefined;
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
    env: {
      ALLOW_TEST_OVERRIDES: '1',
    },
    environment: 'node',
    globals: true,
    // Packages like mcp-app-ui must declare a test script but may not have suites yet.
    passWithNoTests: true,
  },
});
