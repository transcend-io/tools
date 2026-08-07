import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { UserConfig } from 'tsdown';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

const sharedLibraryConfig: UserConfig = {
  clean: true,
  dts: true,
  format: ['esm'],
  sourcemap: true,
  loader: { '.svg': 'text' },
  alias: {
    '@tools/assets': path.join(repoRoot, 'assets'),
  },
};

export default sharedLibraryConfig;
