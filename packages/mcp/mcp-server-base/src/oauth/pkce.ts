import { createHash, randomBytes } from 'node:crypto';

import type { PkcePair } from './types.js';

/**
 * Generates a PKCE code verifier and S256 code challenge per OAuth 2.1 / RFC 7636.
 */
export function generatePkcePair(): PkcePair {
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

/**
 * Generates a cryptographically random OAuth `state` parameter for CSRF protection.
 */
export function generateOAuthState(): string {
  return randomBytes(16).toString('base64url');
}
