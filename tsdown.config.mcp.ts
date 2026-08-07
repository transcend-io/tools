import type { UserConfig } from 'tsdown';

import sharedLibraryConfig from './tsdown.config.base.ts';

/**
 * Shared build settings for MCP servers, the only packages that inline a prebuilt
 * MCP App view.
 *
 * Both settings below exist for that one fact: the `.html` loader turns a view
 * into a single large string literal, which a sourcemap would otherwise embed a
 * second time in `sourcesContent`.
 */
const mcpServerConfig: UserConfig = {
  ...sharedLibraryConfig,
  loader: { ...sharedLibraryConfig.loader, '.html': 'text' },
  outputOptions: {
    // Node reads each source from `sources` on disk instead, an identical stack
    // trace wherever they exist — including the monorepo, where these servers are
    // debugged beside their own `src`.
    //
    // Not in the base config because packages publish `dist` only: an installed
    // copy keeps the mapped TypeScript positions but loses the code frame. Fair
    // for a server a host launches as a subprocess, poor for a library.
    sourcemapExcludeSources: true,
  },
};

export default mcpServerConfig;
