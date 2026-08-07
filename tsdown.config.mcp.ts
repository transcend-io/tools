import type { UserConfig } from 'tsdown';

import sharedLibraryConfig from './tsdown.config.base.ts';

/**
 * Shared build settings for MCP servers, the only packages that may inline a
 * prebuilt MCP App view.
 *
 * The `.html` loader is what turns such a view into a string literal. No
 * published server does this today; the reference views live in
 * `dev/mcp-server-examples`, which is where the loader currently earns its place.
 */
const mcpServerConfig: UserConfig = {
  ...sharedLibraryConfig,
  loader: { ...sharedLibraryConfig.loader, '.html': 'text' },
  outputOptions: {
    // Maps reference their sources rather than embedding them, which is a plain
    // size win over the TypeScript these servers are built from: ~817 KB of maps
    // across the MCP packages becomes ~174 KB. Node reads each source from disk
    // instead, so a server debugged beside its own `src` gets an identical stack
    // trace.
    //
    // Not in the base config because packages publish `dist` only: an installed
    // copy keeps the mapped TypeScript positions but loses the code frame. Fair
    // for a server a host launches as a subprocess, poor for a library.
    sourcemapExcludeSources: true,
  },
};

export default mcpServerConfig;
