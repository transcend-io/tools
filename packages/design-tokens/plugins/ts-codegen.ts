/**
 * Custom Terrazzo plugin that generates nested `as const` TypeScript objects
 * from DTCG token files, matching the API shape expected by @main/theme.
 *
 * Uses the resolver API to produce light/dark mode token sets.
 *
 * Token groups are discovered automatically from the directory structure:
 *   src/primitive/*.tokens.json  → primitive exports (mode-invariant)
 *   src/semantic/*-dark.tokens.json → dark mode overrides (auto-detected)
 *
 * To add a new token type (e.g. spacing):
 * 1. Create the token file(s) under src/primitive/ and/or src/semantic/
 * 2. Add the source(s) to tokens.resolver.json
 */
import { basename, join, resolve } from 'node:path';

import {
  DARK_MODE_SUFFIX,
  HEADER,
  TOKEN_FILE_SUFFIX,
  buildPrimitives,
  buildSemanticObj,
  generateBootstrapScss,
  generatePrimitiveTs,
  generateSemanticTs,
  readTokenDir,
} from './helpers';

interface PluginOptions {
  /** Path to the token source directory (contains primitive/ and semantic/ subdirs). */
  tokenDir?: string;
}

export default function tsCodegenPlugin({ tokenDir = './src' }: PluginOptions = {}) {
  return {
    name: 'ts-codegen',

    build({
      resolver,
      outputFile,
    }: {
      resolver: {
        apply: (input: Record<string, string>) => Record<
          string,
          {
            $type: string;
            $value: unknown;
            $description?: string;
            /** Final token ID of the resolved alias chain, if the raw value was `{foo.bar}`. */
            aliasOf?: string;
          }
        >;
      };
      outputFile: (name: string, contents: string) => void;
    }): void {
      const resolvedDir = resolve(tokenDir);
      const lightTokens = resolver.apply({ theme: 'light' });
      const darkTokens = resolver.apply({ theme: 'dark' });

      const barrelExports: string[] = [];
      // Populated as primitives are emitted; passed into semantic generation
      // so aliases to these groups become live TS references.
      const primitiveGroupNames = new Set<string>();

      const emitGroup = (subdir: string, entries: { name: string; content: string }[]): void => {
        if (entries.length === 0) {
          return;
        }
        const barrelLines = entries.map(({ name }) => `export * from './${name}.js';`);
        for (const { name, content } of entries) {
          outputFile(`${subdir}/${name}.ts`, content);
        }
        outputFile(`${subdir}/index.ts`, `${HEADER}${barrelLines.join('\n')}\n`);
        barrelExports.push(`./${subdir}`);
      };

      emitGroup(
        'primitive',
        readTokenDir(join(resolvedDir, 'primitive')).map(({ filename, topLevelKeys }) => {
          if (topLevelKeys.length !== 1) {
            throw new Error(
              `Primitive file ${filename} must have exactly one top-level key, ` +
                `found ${topLevelKeys.length}: ${topLevelKeys.join(', ')}`,
            );
          }
          const name = topLevelKeys[0]!;
          primitiveGroupNames.add(name);
          return {
            name,
            content: generatePrimitiveTs(name, buildPrimitives(lightTokens, `${name}.`)),
          };
        }),
      );

      emitGroup(
        'semantic',
        readTokenDir(
          join(resolvedDir, 'semantic'),
          // Only skip files that actually end in `-dark.tokens.json`.
          // A substring check would incorrectly drop unrelated names that
          // happen to contain `-dark` (e.g. `my-dark-theme.tokens.json`).
          (f) => !f.endsWith(`${DARK_MODE_SUFFIX}${TOKEN_FILE_SUFFIX}`),
        ).map(({ filename, topLevelKeys }) => {
          const name = basename(filename, TOKEN_FILE_SUFFIX);
          return {
            name,
            content: generateSemanticTs(
              name,
              {
                light: buildSemanticObj(lightTokens, topLevelKeys, primitiveGroupNames),
                dark: buildSemanticObj(darkTokens, topLevelKeys, primitiveGroupNames),
              },
              primitiveGroupNames,
            ),
          };
        }),
      );

      const rootExports = barrelExports.map((p) => `export * from '${p}/index.js';`).join('\n');
      outputFile('index.ts', `${HEADER}${rootExports}\n`);

      outputFile('_bootstrap-variables.scss', generateBootstrapScss(lightTokens));
    },
  };
}
