import { defineConfig } from '@terrazzo/cli';

import tsCodegen from './plugins/ts-codegen.ts';

export default defineConfig({
  tokens: ['./tokens/tokens.resolver.json'],
  outDir: './src',
  plugins: [tsCodegen({ tokenDir: './tokens' })],
});
