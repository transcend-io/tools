import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

describe('customer examples', () => {
  it('type-checks the supported Deno handler shapes', () => {
    // Why: customers need copyable examples that match the published contract.
    // Given: the Deno datapoint, enricher, and General examples.
    // When: TypeScript checks them against the package.
    // Then: every example compiles without errors.
    expect(() =>
      execFileSync('pnpm', ['exec', 'tsc', '-p', 'examples/tsconfig.json', '--noEmit'], {
        cwd: packageRoot,
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });
});
