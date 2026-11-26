import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
  dependencies?: Record<string, string>;
};

describe('@transcend-io/type-utils package.json', () => {
  it('does not depend on other @transcend-io packages', () => {
    const transcendDependencies = Object.keys(packageJson.dependencies ?? {}).filter((name) =>
      name.startsWith('@transcend-io/'),
    );

    expect(transcendDependencies).toEqual([]);
  });
});
