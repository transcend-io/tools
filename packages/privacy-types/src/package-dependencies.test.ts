import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
  dependencies?: Record<string, string>;
};

/** Workspace @transcend-io packages privacy-types is allowed to depend on. */
const ALLOWED_TRANSCEND_IO_DEPENDENCIES = [
  '@transcend-io/airgap.js-types',
  '@transcend-io/internationalization',
  '@transcend-io/type-utils',
] as const;

describe('@transcend-io/privacy-types package.json', () => {
  it('does not add @transcend-io dependencies beyond the allowed set', () => {
    const transcendDependencies = Object.keys(packageJson.dependencies ?? {}).filter((name) =>
      name.startsWith('@transcend-io/'),
    );

    expect(transcendDependencies.sort()).toEqual([...ALLOWED_TRANSCEND_IO_DEPENDENCIES].sort());
  });
});
