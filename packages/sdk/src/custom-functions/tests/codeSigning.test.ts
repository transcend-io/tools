import { describe, expect, it } from 'vitest';

import { decodeJwtPayload, diffCustomFunctionCode } from '../codeSigning.js';

/**
 * Build an unsigned JWT with the given payload (signature is not verified by
 * the decoder, so any signature segment works for tests).
 *
 * @param payload - The payload object
 * @returns A JWT-shaped string
 */
function fakeJwt(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS384', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

const CODE = 'export default async () => 42;';

/**
 * Build the pair of signed JWTs an existing custom function would have.
 *
 * @param overrides - Context overrides
 * @returns The signed JWT pair
 */
function existingJwts(
  overrides: {
    /** Code override */
    code?: string;
    /** Allowed hosts */
    allowedHosts?: string[];
    /** Third party imports flag */
    allowThirdPartyImports?: boolean;
    /** Timeout */
    timeoutMs?: number;
    /** Encrypted env vars keyed by name */
    userDefinedEncryptedEnv?: Record<string, unknown>;
  } = {},
): {
  /** Signed code JWT */
  signedCodeJwt: string;
  /** Signed context JWT */
  signedCodeContextJwt: string;
} {
  const { code = CODE, ...context } = overrides;
  return {
    signedCodeJwt: fakeJwt({ base64Code: Buffer.from(code, 'utf-8').toString('base64') }),
    signedCodeContextJwt: fakeJwt({
      allowedHosts: [],
      userDefinedEncryptedEnv: {},
      ...context,
    }),
  };
}

describe('decodeJwtPayload', () => {
  it('decodes a JWT payload without verification', () => {
    expect(decodeJwtPayload(fakeJwt({ foo: 'bar' }))).toEqual({ foo: 'bar' });
  });

  it('returns undefined for malformed input', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeUndefined();
    expect(decodeJwtPayload('a.b')).toBeUndefined();
  });
});

describe('diffCustomFunctionCode', () => {
  it('detects no changes for identical code and context', () => {
    const diff = diffCustomFunctionCode(
      { code: CODE, context: { userDefinedEnv: {}, allowedHosts: [] } },
      existingJwts(),
    );
    expect(diff.changed).toBe(false);
    expect(diff.changedFields).toEqual([]);
  });

  it('detects code changes', () => {
    const diff = diffCustomFunctionCode(
      { code: 'export default async () => 43;', context: { userDefinedEnv: {}, allowedHosts: [] } },
      existingJwts(),
    );
    expect(diff.changedFields).toEqual(['code']);
  });

  it('ignores allowed host ordering', () => {
    const diff = diffCustomFunctionCode(
      { code: CODE, context: { userDefinedEnv: {}, allowedHosts: ['b.com', 'a.com'] } },
      existingJwts({ allowedHosts: ['a.com', 'b.com'] }),
    );
    expect(diff.changed).toBe(false);
  });

  it('detects context changes', () => {
    const diff = diffCustomFunctionCode(
      {
        code: CODE,
        context: {
          userDefinedEnv: { NEW_VAR: 'secret' },
          allowedHosts: ['api.example.com'],
          allowThirdPartyImports: true,
          timeoutMs: 10_000,
        },
      },
      existingJwts(),
    );
    expect(diff.changedFields).toEqual([
      'allowedHosts',
      'allowThirdPartyImports',
      'timeoutMs',
      'env',
    ]);
  });

  it('compares env variable names only', () => {
    // Same name, different (encrypted vs plaintext) values — not detectable
    const diff = diffCustomFunctionCode(
      { code: CODE, context: { userDefinedEnv: { API_KEY: 'new-value' }, allowedHosts: [] } },
      existingJwts({ userDefinedEncryptedEnv: { API_KEY: { ciphertext: 'xyz' } } }),
    );
    expect(diff.changed).toBe(false);
  });
});
