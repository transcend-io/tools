import { describe, expect, it } from 'vitest';

import {
  getDenoRuntimeCompatibility,
  parseDenoRuntimeVersion,
  RECOMMENDED_DENO_VERSION,
} from '../deno-runtime.js';

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

describe('getDenoRuntimeCompatibility', () => {
  it('accepts the production runtime version', () => {
    expect(getDenoRuntimeCompatibility(`deno ${RECOMMENDED_DENO_VERSION}\n`)).toEqual({
      level: 'compatible',
    });
  });

  it('warns for a different Deno 2 runtime', () => {
    expect(getDenoRuntimeCompatibility('deno 2.5.6\n')).toEqual({
      level: 'warning',
      message: 'Deno 2.5.6 is compatible, but 2.4.5 matches the current production runtime.',
    });
  });

  it('explains an unsupported older version', () => {
    expect(getDenoRuntimeCompatibility('deno 1.46.3\n')).toEqual({
      level: 'error',
      message:
        'Deno 2.x is required; found 1.46.3. Install or switch versions using https://docs.deno.com/runtime/getting_started/installation/',
    });
  });

  it('rejects unreadable version output', () => {
    expect(getDenoRuntimeCompatibility('unexpected output')).toMatchObject({
      level: 'error',
      message: expect.stringContaining('installed version could not be determined'),
    });
  });
});
