import { createHash } from 'node:crypto';

import { z } from 'zod';

import { normalizeIssuer } from '../normalize-issuer.js';
import type { StoredOAuthTokens } from '../types.js';

/** Latest time a JavaScript `Date` can represent, in milliseconds since the epoch. */
const MAX_EXPIRES_AT_MS = 8.64e15;

/**
 * Longest ahead an access-token `expiresAt` may sit after load. Rejects disk edits
 * that pick an implausible expiry to win keychain-vs-file merges.
 */
export const MAX_ACCESS_TOKEN_EXPIRES_AHEAD_MS = 90 * 24 * 60 * 60 * 1000;

/** Length of the scope digest at the end of a store key. */
const SCOPES_DIGEST_LENGTH = 16;

/** Matches the scope digest that ends every store key. */
const SCOPES_DIGEST_PATTERN = new RegExp(`^[0-9a-f]{${SCOPES_DIGEST_LENGTH}}$`);

const StoredOAuthTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresAt: z.number().int().nonnegative().max(MAX_EXPIRES_AT_MS),
  scope: z.string().optional(),
  issuer: z.string().min(1),
  clientId: z.string().min(1),
  /** Key the entry was saved under, so it cannot be loaded under another key. */
  key: z.string().min(1),
});

/** A login as written to a store: the tokens plus the key they belong to. */
export type StoredOAuthTokensEntry = StoredOAuthTokens & { key: string };

/** What a saved login is for. */
export interface CredentialStoreKeyParts {
  /** OAuth authorization server issuer URL */
  issuer: string;
  /** OAuth client identifier */
  clientId: string;
  /** Scopes the server asks for at sign-in */
  scopes: readonly string[];
}

/** Separates the parts of a store key. */
const KEY_DELIMITER = '|';

/**
 * Escapes the delimiter, and the escape character, in one part of a key. Without
 * it, an issuer or client ID that contains `|` could build the key of a different
 * issuer and client pair.
 */
function escapeKeyPart(part: string): string {
  return part.replaceAll('%', '%25').replaceAll(KEY_DELIMITER, '%7C');
}

function credentialStoreKeyPrefix(issuer: string, clientId: string): string {
  return [escapeKeyPart(normalizeIssuer(issuer)), escapeKeyPart(clientId), ''].join(KEY_DELIMITER);
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
  const scopesDigest = createHash('sha256')
    .update(scopes)
    .digest('hex')
    .slice(0, SCOPES_DIGEST_LENGTH);
  return `${credentialStoreKeyPrefix(parts.issuer, parts.clientId)}${scopesDigest}`;
}

/**
 * Returns true when `key` names a login of the issuer and client in `tokens`.
 *
 * Only a scope digest may follow the issuer and client, so a client ID that
 * contains `|` cannot match a key that belongs to a longer client ID.
 */
export function isCredentialStoreKeyFor(key: string, tokens: StoredOAuthTokens): boolean {
  const prefix = credentialStoreKeyPrefix(tokens.issuer, tokens.clientId);
  if (!key.startsWith(prefix)) return false;
  return SCOPES_DIGEST_PATTERN.test(key.slice(prefix.length));
}

/** Builds the entry a store writes for `tokens` saved under `key`. */
export function toStoredOAuthTokensEntry(
  tokens: StoredOAuthTokens,
  key: string,
): StoredOAuthTokensEntry {
  return { ...tokens, key };
}

/**
 * Validates an entry read from a store.
 *
 * Returns `null` for a wrong shape, for an entry saved under a different key
 * (so a login for one scope set is never reused for another), and for an entry
 * whose issuer and client do not match `key`.
 */
export function parseStoredOAuthTokens(
  value: unknown,
  key: string,
  nowMs: number = Date.now(),
): StoredOAuthTokens | null {
  const parsed = StoredOAuthTokensSchema.safeParse(value);
  if (!parsed.success) return null;
  const { key: savedKey, ...tokens } = parsed.data;
  if (savedKey !== key) return null;
  if (tokens.expiresAt > nowMs + MAX_ACCESS_TOKEN_EXPIRES_AHEAD_MS) return null;
  return isCredentialStoreKeyFor(key, tokens) ? tokens : null;
}

/** Parses a serialized entry, treating malformed JSON as no entry. */
export function parseSerializedOAuthTokens(
  raw: string,
  key: string,
  nowMs?: number,
): StoredOAuthTokens | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
  return parseStoredOAuthTokens(value, key, nowMs);
}
