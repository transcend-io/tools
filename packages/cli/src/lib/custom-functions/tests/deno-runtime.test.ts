import { describe, expect, it } from 'vitest';

import { parseDenoRuntimeVersion, unsupportedDenoVersionMessage } from '../deno-runtime.js';

describe('parseDenoRuntimeVersion', () => {
  it('reads the runtime version from Deno output', () => {
    expect(
      parseDenoRuntimeVersion('deno 2.4.5 (stable, release, aarch64-apple-darwin)\nv8 13.0\n'),
    ).toEqual({
      version: '2.4.5',
      major: 2,
    });
  });

  it.each([
    ['deno 2.4.5\r\nv8 13.0\r\n', { version: '2.4.5', major: 2 }],
    ['deno 2.6.0-rc.1\n', { version: '2.6.0-rc.1', major: 2 }],
    ['', undefined],
    ['unexpected localized output', undefined],
  ])('handles version output edge case %j', (output, expected) => {
    expect(parseDenoRuntimeVersion(output)).toEqual(expected);
  });
});

describe('unsupportedDenoVersionMessage', () => {
  it('accepts the production runtime version', () => {
    expect(unsupportedDenoVersionMessage('deno 2.4.5\n')).toBeUndefined();
  });

  it('rejects a different Deno runtime patch', () => {
    expect(unsupportedDenoVersionMessage('deno 2.4.6\n')).toContain(
      'Deno 2.4.5 is required; found 2.4.6',
    );
  });

  it('explains an unsupported older version', () => {
    expect(unsupportedDenoVersionMessage('deno 1.46.3\n')).toContain(
      'Deno 2.4.5 is required; found 1.46.3',
    );
  });
});
