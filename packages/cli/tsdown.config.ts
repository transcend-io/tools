import { defineConfig } from 'tsdown';

import sharedConfig from '../../tsdown.config.base.ts';

export default defineConfig({
  ...sharedConfig,
  entry: [
    'src/bin/cli.ts',
    'src/bin/bash-complete.ts',
    'src/bin/deprecated-command.ts',
    'src/index.ts',
    'src/commands/admin/chunk-csv/worker.ts',
    'src/commands/admin/parquet-to-csv/worker.ts',
  ],
  minify: true,
  splitting: true,
  tsconfig: 'tsconfig.json',
});
