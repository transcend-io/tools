import { defineConfig } from '@terrazzo/cli';
import css from '@terrazzo/plugin-css';

import tsCodegen from './plugins/ts-codegen.ts';

/**
 * For rest-state suffixes, also emit a shorter alias:
 * - `--foo-default: …` → `--foo: var(--foo-default)` (named default leaves)
 * - `--foo-$root: …` → `--foo: var(--foo-$root)` (DTCG `$root` tokens)
 */
function withRestStateAliases(contents: string): string {
  return contents
    .replace(
      /(^|\n)([ \t]*)(--([a-z0-9-]+)-default)(\s*:\s*[^;]+;)/g,
      (_match, lead: string, indent: string, full: string, short: string, rest: string) =>
        `${lead}${indent}${full}${rest}\n${indent}--${short}: var(${full});`,
    )
    .replace(
      /(^|\n)([ \t]*)(--([a-z0-9-]+)-\$root)(\s*:\s*[^;]+;)/g,
      (_match, lead: string, indent: string, full: string, short: string, rest: string) =>
        `${lead}${indent}${full}${rest}\n${indent}--${short}: var(${full});`,
    );
}

export default defineConfig({
  tokens: ['./tokens/tokens.resolver.json'],
  outDir: './src',
  plugins: [
    tsCodegen({ tokenDir: './tokens' }),
    css({
      filename: 'tokens.css',
      // Keep `--` prefix so alias refs stay valid (`var(--name)`, not `var(name)`).
      variableName: (token) => `--${token.id.replace(/\./g, '-')}`,
      permutations: [
        {
          // Dark mode omitted until color-dark.tokens.json has real overrides.
          input: { theme: 'light' },
          prepare: (contents) =>
            `:root {\n  color-scheme: light;\n  ${withRestStateAliases(contents)}\n}`,
        },
      ],
    }),
  ],
});
