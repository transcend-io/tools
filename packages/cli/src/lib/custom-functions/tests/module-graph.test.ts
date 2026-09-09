import { describe, expect, it } from 'vitest';

import { findNonSelfContainedRuntimeImports } from '../module-graph.js';

describe('findNonSelfContainedRuntimeImports', () => {
  it('rejects local runtime imports while permitting type-only and remote imports', () => {
    expect(
      findNonSelfContainedRuntimeImports(
        JSON.stringify({
          roots: ['file:///repo/function.ts'],
          modules: [
            {
              specifier: 'file:///repo/function.ts',
              dependencies: [
                {
                  specifier: './helper.ts',
                  code: { specifier: 'file:///repo/helper.ts' },
                },
                {
                  specifier: './types.ts',
                  type: { specifier: 'file:///repo/types.ts' },
                },
                {
                  specifier: 'npm:is-number@7',
                  code: { specifier: 'npm:/is-number@7.0.0' },
                },
                {
                  specifier: 'https://example.com/mod.ts',
                  code: { specifier: 'https://example.com/mod.ts' },
                },
                {
                  specifier: 'local-alias',
                  code: { specifier: 'https://example.com/aliased.ts' },
                },
              ],
            },
          ],
        }),
      ),
    ).toEqual(['./helper.ts', 'local-alias']);
  });

  it('rejects malformed Deno module graph output', () => {
    expect(() => findNonSelfContainedRuntimeImports('{}')).toThrow(
      'Deno returned an unexpected module graph.',
    );
  });
});
