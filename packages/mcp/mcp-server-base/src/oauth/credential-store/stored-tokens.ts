import { createHash } from 'node:crypto';

import { z } from 'zod';

import { normalizeIssuer } from '../normalize-issuer.js';
import type { StoredOAuthTokens } from '../types.js';

const StoredOAuthTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresAt: z.number(),
  scope: z.string().optional(),
  issuer: z.string().min(1),
  clientId: z.string().min(1),
});

/** What a saved login is for. */
export interface CredentialStoreKeyParts {
  /** OAuth authorization server issuer URL */
  issuer: string;
  /** OAuth client identifier */
  clientId: string;
  /** Scopes the server asks for at sign-in */
  scopes: readonly string[];
}

function credentialStoreKeyPrefix(issuer: string, clientId: string): string {
  return `${normalizeIssuer(issuer)}|${clientId}|`;
}

/**
 * Key a login is saved under. It depends only on the issuer, the client, and
 * the scopes asked for, so every restart finds the same entry.
 *
 * The scopes are part of the key because servers that share one OAuth client
 * can ask for different scopes. A login granted for one set must not be reused
 * for another.
 */
export function credentialStoreKey(parts: CredentialStoreKeyParts): string {
  const scopes = [...new Set(parts.scopes)].sort().join(' ');
  const scopesDigest = createHash('sha256').update(scopes).digest('hex').slice(0, 16);
  return `${credentialStoreKeyPrefix(parts.issuer, parts.clientId)}${scopesDigest}`;
}

/** Returns true when `key` names a login of the issuer and client in `tokens`. */
export function isCredentialStoreKeyFor(key: string, tokens: StoredOAuthTokens): boolean {
  return key.startsWith(credentialStoreKeyPrefix(tokens.issuer, tokens.clientId));
}

/**
 * Validates an entry read from a store.
 *
 * Returns `null` for a wrong shape, and for an entry whose issuer and client do
 * not match `key`, so a login saved for one client is never handed to another.
 */
export function parseStoredOAuthTokens(value: unknown, key: string): StoredOAuthTokens | null {
  const parsed = StoredOAuthTokensSchema.safeParse(value);
  if (!parsed.success) return null;
  return isCredentialStoreKeyFor(key, parsed.data) ? parsed.data : null;
}

/** Parses a serialized entry, treating malformed JSON as no entry. */
export function parseSerializedOAuthTokens(raw: string, key: string): StoredOAuthTokens | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
  return parseStoredOAuthTokens(value, key);
}
