import type { UserConfig } from 'tsdown';

const sharedLibraryConfig: UserConfig = {
  clean: true,
  dts: true,
  format: ['esm'],
  sourcemap: true,
};

export default sharedLibraryConfig;
