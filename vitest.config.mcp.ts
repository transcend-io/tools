import { existsSync, readFileSync } from 'node:fs';

import { mergeConfig, type Plugin, type ViteUserConfig } from 'vitest/config';

import sharedConfig from './vitest.config.ts';

/**
 * Loads a prebuilt MCP App view as a string, the way the build does.
 *
 * Tests resolve workspace packages through the `@transcend-io/source` condition,
 * so they run against `src` and never see the `.html` loader in
 * `tsdown.config.mcp.ts`. Without the equivalent here, Vite hands the document to
 * its JS parser and the import fails on the first tag rather than anywhere near
 * the test that triggered it.
 *
 * @returns The plugin
 */
function mcpAppViewLoader(): Plugin {
  return {
    name: 'transcend:mcp-app-view-loader',
    load(id) {
      if (!id.endsWith('.html')) return undefined;

      // The document is a gitignored build output, so a clean clone reaches here
      // before anything has produced it. Naming the command beats the bare ENOENT
      // that reading it would throw.
      if (!existsSync(id)) {
        throw new Error(`${id} has not been built. Run \`pnpm build:ui\` in the package first.`);
      }

      return `export default ${JSON.stringify(readFileSync(id, 'utf8'))}`;
    },
  };
}

/**
 * Test settings for MCP servers, which are the only packages that inline a view.
 *
 * Kept out of the root config so `.html` keeps its usual meaning everywhere else,
 * mirroring how `tsdown.config.mcp.ts` scopes the matching build-side loader.
 * Packages opt in through their `test` script rather than a local config file, so
 * there is one place to change and `package-conventions.test.ts` can enforce it.
 *
 * The cast narrows away the callback forms that `defineConfig` admits in its
 * return type; `mergeConfig` takes objects only, and the root config is one.
 */
export default mergeConfig(sharedConfig as ViteUserConfig, {
  plugins: [mcpAppViewLoader()],
});
