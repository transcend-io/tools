import { defineConfig } from 'tsdown';

import sharedConfig from '../../tsdown.config.base.ts';

export default defineConfig({
  ...sharedConfig,
  entry: {
    index: 'src/index.ts',
    'transcend-yml': 'src/transcend-yml/index.ts',
  },
});
