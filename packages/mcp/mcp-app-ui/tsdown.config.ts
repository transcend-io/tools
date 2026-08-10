import { defineConfig } from 'tsdown';
import svgr from 'vite-plugin-svgr';

import sharedConfig from '../../../tsdown.config.mcp.ts';

export default defineConfig({
  ...sharedConfig,
  entry: ['src/index.ts'],
  // Turns `*.svg?react` into React components for the published bundle. Bare
  // `.svg` imports still use the shared text loader (e.g. OAuth markup).
  plugins: [...(sharedConfig.plugins ?? []), svgr()],
});
