import type { UserConfig } from 'tsdown';

import sharedLibraryConfig from './tsdown.config.base.ts';

/**
 * Shared build settings for MCP servers, the only packages that may inline a
 * prebuilt MCP App view.
 *
 * The `.html` loader is what turns a view into a string literal. No published
 * server does this today; the reference views live in `dev/mcp-server-examples`.
 */
const mcpServerConfig: UserConfig = {
  ...sharedLibraryConfig,
  loader: { ...sharedLibraryConfig.loader, '.html': 'text' },
  outputOptions: {
    // Maps reference their sources rather than embedding them, taking ~817 KB
    // across the MCP packages to ~174 KB. Node reads each source from disk, so a
    // server debugged beside its own `src` gets an identical stack trace.
    //
    // Not in the base config because packages publish `dist` only: an installed
    // copy keeps the mapped positions but loses the code frame. Fair for a server
    // a host launches as a subprocess, poor for a library.
    sourcemapExcludeSources: true,
  },
};

export default mcpServerConfig;
