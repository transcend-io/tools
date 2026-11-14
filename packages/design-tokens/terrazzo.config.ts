import { readFileSync } from 'node:fs';

import { defineConfig } from '@terrazzo/cli';
import css from '@terrazzo/plugin-css';

import tsCodegen from './plugins/ts-codegen.ts';

/**
 * For rest-state `default` leaves, also emit a shorter alias:
 * `--foo-default: …` → `--foo: var(--foo-default)`
 */
function withRestStateAliases(contents: string): string {
  return contents.replace(
    /(^|\n)([ \t]*)(--([a-z0-9-]+)-default)(\s*:\s*[^;]+;)/g,
    (_match, lead: string, indent: string, full: string, short: string, rest: string) =>
      `${lead}${indent}${full}${rest}\n${indent}--${short}: var(${full});`,
  );
}

const semanticColorGroups = Object.keys(
  JSON.parse(readFileSync('./tokens/semantic/color.tokens.json', 'utf8')) as Record<
    string,
    unknown
  >,
).filter((key) => !key.startsWith('$'));

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
          input: { theme: 'light' },
          prepare: (contents) =>
            `:root {\n  color-scheme: light;\n  ${withRestStateAliases(contents)}\n}`,
        },
        {
          input: { theme: 'dark' },
          // Palette and typography are mode-invariant and already set on `:root`.
          include: semanticColorGroups.map((group) => `${group}.**`),
          prepare: (contents) =>
            `[data-theme="dark"] {\n  color-scheme: dark;\n  ${withRestStateAliases(contents)}\n}`,
        },
      ],
    }),
  ],
});
