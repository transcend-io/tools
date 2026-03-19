import { defineConfig } from 'tsdown';

import sharedConfig from '../../tsdown.config.base.ts';

export default defineConfig({
  ...sharedConfig,
  entry: [
    'src/bin/cli.ts',
    'src/bin/bash-complete.ts',
    'src/bin/deprecated-command.ts',
    'src/index.ts',
  ],
  minify: true,
  splitting: true,
  tsconfig: 'tsconfig.json',
});
