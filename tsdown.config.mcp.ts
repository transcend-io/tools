import type { UserConfig } from 'tsdown';

import sharedLibraryConfig from './tsdown.config.base.ts';

/**
 * Shared build settings for MCP servers, the only packages that may inline a
 * prebuilt MCP App view.
 *
 * The `.html` loader is what turns a view into the string literal a server serves
 * over `resources/read`.
 */
const mcpServerConfig: UserConfig = {
  ...sharedLibraryConfig,
  loader: { ...sharedLibraryConfig.loader, '.html': 'text' },
  outputOptions: {
    // Maps reference their sources rather than embedding them, which is most of
    // what a published map weighs. Node reads each source from disk, so a server
    // debugged beside its own `src` gets an identical stack trace.
    //
    // Not in the base config because packages publish `dist` only: an installed
    // copy keeps the mapped positions but loses the code frame. Fair for a server
    // a host launches as a subprocess, poor for a library.
    sourcemapExcludeSources: true,
  },
};

export default mcpServerConfig;
