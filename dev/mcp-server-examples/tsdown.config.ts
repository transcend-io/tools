import { defineConfig } from 'tsdown';

import sharedConfig from '../../tsdown.config.mcp.ts';

export default defineConfig({
  ...sharedConfig,
  entry: ['src/index.ts', 'src/cli.ts'],
});
