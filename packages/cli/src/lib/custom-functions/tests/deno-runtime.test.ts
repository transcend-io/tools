import { describe, expect, it } from 'vitest';

import { parseDenoRuntimeVersion, unsupportedDenoVersionMessage } from '../deno-runtime.js';

describe('parseDenoRuntimeVersion', () => {
  it('reads the runtime version from Deno output', () => {
    expect(
      parseDenoRuntimeVersion('deno 2.5.6 (stable, release, aarch64-apple-darwin)\nv8 14.0\n'),
    ).toEqual({
      version: '2.5.6',
      major: 2,
    });
  });
});

describe('unsupportedDenoVersionMessage', () => {
  it('accepts Deno 2.x', () => {
    expect(unsupportedDenoVersionMessage('deno 2.0.0\n')).toBeUndefined();
  });

  it('explains an unsupported major version', () => {
    expect(unsupportedDenoVersionMessage('deno 1.46.3\n')).toContain(
      'Deno 2.x is required; found 1.46.3',
    );
  });
});
