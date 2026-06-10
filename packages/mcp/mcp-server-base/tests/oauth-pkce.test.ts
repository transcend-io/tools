import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { generateOAuthState, generatePkcePair } from '../src/oauth/pkce.js';

describe('generatePkcePair', () => {
  it('produces an S256 challenge from the verifier', () => {
    const { codeVerifier, codeChallenge } = generatePkcePair();
    const expected = createHash('sha256').update(codeVerifier).digest('base64url');
    expect(codeChallenge).toBe(expected);
  });

  it('generates unique pairs', () => {
    const a = generatePkcePair();
    const b = generatePkcePair();
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
  });
});

describe('generateOAuthState', () => {
  it('generates non-empty state values', () => {
    expect(generateOAuthState().length).toBeGreaterThan(10);
  });
});
