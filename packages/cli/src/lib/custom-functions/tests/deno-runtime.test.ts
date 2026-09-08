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

  it.each([
    ['deno 2.5.6\r\nv8 14.0\r\n', { version: '2.5.6', major: 2 }],
    ['deno 2.6.0-rc.1\n', { version: '2.6.0-rc.1', major: 2 }],
    ['', undefined],
    ['unexpected localized output', undefined],
  ])('handles version output edge case %j', (output, expected) => {
    expect(parseDenoRuntimeVersion(output)).toEqual(expected);
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
