import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { repoRoot } from './lib/repo-files.ts';

type PackageJson = {
  dependencies?: Record<string, string>;
};

/** Expected `@transcend-io/*` dependency allowlist per published type package. */
const TYPE_PACKAGE_LAYERING = {
  'packages/type-utils': [] as const,
  'packages/internationalization': [] as const,
  'packages/airgap.js-types': [
    '@transcend-io/internationalization',
    '@transcend-io/type-utils',
  ] as const,
  'packages/privacy-types': [
    '@transcend-io/airgap.js-types',
    '@transcend-io/internationalization',
    '@transcend-io/type-utils',
  ] as const,
} as const;

describe('type package layering', () => {
  for (const [packageDirectory, allowedDependencies] of Object.entries(TYPE_PACKAGE_LAYERING)) {
    it(`${packageDirectory} keeps downward @transcend-io dependencies only`, () => {
      const packageJson = JSON.parse(
        readFileSync(join(repoRoot, packageDirectory, 'package.json'), 'utf8'),
      ) as PackageJson;

      const transcendDependencies = Object.keys(packageJson.dependencies ?? {}).filter((name) =>
        name.startsWith('@transcend-io/'),
      );

      expect(transcendDependencies.sort()).toEqual([...allowedDependencies].sort());
    });
  }
});
