import { readFileSync } from 'node:fs';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

import type { OAuthTokenAuth } from '../auth.js';
import {
  DEFAULT_OAUTH_EXPIRES_IN_SECONDS,
  OAUTH_TOKEN_EXPIRY_SKEW_SECONDS,
  TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV,
} from './constants.js';
import type { OAuthTokenResponse, StoredOAuthTokens } from './types.js';

interface TokenStoreFile {
  tokensByIssuer?: Record<string, StoredOAuthTokens>;
}

/**
 * Returns the path to the OAuth token store file.
 */
export function getOAuthTokenStorePath(): string {
  const override = process.env[TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV]?.trim();
  if (override) {
    return override;
  }
  return path.join(homedir(), '.config', 'transcend-mcp', 'tokens.json');
}

function normalizeIssuer(issuer: string): string {
  return issuer.replace(/\/+$/, '');
}

/**
 * Computes the expiry timestamp for a token response with a 60-second skew buffer.
 */
export function computeOAuthExpiresAt(
  expiresInSeconds: number = DEFAULT_OAUTH_EXPIRES_IN_SECONDS,
  nowMs: number = Date.now(),
): number {
  const effectiveLifetimeSeconds = Math.max(0, expiresInSeconds - OAUTH_TOKEN_EXPIRY_SKEW_SECONDS);
  return nowMs + effectiveLifetimeSeconds * 1000;
}

/**
 * Builds a {@link StoredOAuthTokens} record from a token endpoint response.
 */
export function storedTokensFromTokenResponse(params: {
  response: OAuthTokenResponse;
  issuer: string;
  clientId: string;
  nowMs?: number;
}): StoredOAuthTokens {
  const { response, issuer, clientId, nowMs } = params;
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: computeOAuthExpiresAt(response.expires_in, nowMs),
    scope: response.scope,
    issuer: normalizeIssuer(issuer),
    clientId,
  };
}

/**
 * Builds updated stored tokens from a refresh response, preserving the prior
 * refresh token when the authorization server does not rotate it.
 */
export function storedTokensFromRefreshResponse(params: {
  response: OAuthTokenResponse;
  previous: StoredOAuthTokens;
  nowMs?: number;
}): StoredOAuthTokens {
  const next = storedTokensFromTokenResponse({
    response: params.response,
    issuer: params.previous.issuer,
    clientId: params.previous.clientId,
    nowMs: params.nowMs,
  });
  return {
    ...next,
    refreshToken: params.response.refresh_token ?? params.previous.refreshToken,
    scope: params.response.scope ?? params.previous.scope,
  };
}

/**
 * Returns true when stored tokens are still within their effective lifetime.
 */
export function isStoredOAuthTokenValid(
  tokens: StoredOAuthTokens,
  nowMs: number = Date.now(),
): boolean {
  return tokens.expiresAt > nowMs;
}

/**
 * Returns true when in-memory OAuth credentials are still within their effective lifetime.
 */
export function isOAuthTokenAuthValid(auth: OAuthTokenAuth, nowMs: number = Date.now()): boolean {
  if (auth.expiresAt === undefined) {
    return true;
  }
  return auth.expiresAt > nowMs;
}

/**
 * Converts persisted tokens into request auth credentials.
 */
export function storedOAuthTokensToAuth(tokens: StoredOAuthTokens): OAuthTokenAuth {
  return {
    type: 'oauthToken',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  };
}

function parseStoredOAuthTokens(raw: string, issuer: string): StoredOAuthTokens | null {
  let parsed: TokenStoreFile;
  try {
    parsed = JSON.parse(raw) as TokenStoreFile;
  } catch {
    return null;
  }

  const tokens = parsed.tokensByIssuer?.[normalizeIssuer(issuer)];
  if (!tokens || typeof tokens.accessToken !== 'string') {
    return null;
  }

  return tokens;
}

/**
 * Reads stored OAuth tokens for the given issuer, or `null` when missing or invalid JSON.
 */
export async function readStoredOAuthTokens(issuer: string): Promise<StoredOAuthTokens | null> {
  const storePath = getOAuthTokenStorePath();
  let raw: string;
  try {
    raw = await readFile(storePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  return parseStoredOAuthTokens(raw, issuer);
}

/**
 * Synchronous variant of {@link readStoredOAuthTokens} for stdio startup.
 */
export function readStoredOAuthTokensSync(issuer: string): StoredOAuthTokens | null {
  const storePath = getOAuthTokenStorePath();
  try {
    const raw = readFileSync(storePath, 'utf8');
    return parseStoredOAuthTokens(raw, issuer);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Persists OAuth tokens for the given issuer.
 */
export async function writeStoredOAuthTokens(tokens: StoredOAuthTokens): Promise<void> {
  const storePath = getOAuthTokenStorePath();
  await mkdir(path.dirname(storePath), { recursive: true });

  const issuer = normalizeIssuer(tokens.issuer);
  let existing: TokenStoreFile = {};
  try {
    existing = JSON.parse(await readFile(storePath, 'utf8')) as TokenStoreFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const next: TokenStoreFile = {
    tokensByIssuer: {
      ...(existing.tokensByIssuer ?? {}),
      [issuer]: { ...tokens, issuer },
    },
  };

  const tempPath = `${storePath}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(next, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  await rename(tempPath, storePath);
}

/**
 * Loads valid OAuth credentials for an issuer from the token store.
 */
export async function loadValidOAuthCredentials(
  issuer: string,
  nowMs: number = Date.now(),
): Promise<OAuthTokenAuth | null> {
  const stored = await readStoredOAuthTokens(issuer);
  return stored && isStoredOAuthTokenValid(stored, nowMs) ? storedOAuthTokensToAuth(stored) : null;
}

/**
 * Synchronous variant of {@link loadValidOAuthCredentials} for stdio startup.
 */
export function loadValidOAuthCredentialsSync(
  issuer: string,
  nowMs: number = Date.now(),
): OAuthTokenAuth | null {
  const stored = readStoredOAuthTokensSync(issuer);
  return stored && isStoredOAuthTokenValid(stored, nowMs) ? storedOAuthTokensToAuth(stored) : null;
}

/**
 * Removes stored OAuth tokens for the given issuer.
 */
export async function clearStoredOAuthTokens(issuer: string): Promise<void> {
  const storePath = getOAuthTokenStorePath();
  let existing: TokenStoreFile;
  try {
    existing = JSON.parse(await readFile(storePath, 'utf8')) as TokenStoreFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }

  const normalizedIssuer = normalizeIssuer(issuer);
  const tokensByIssuer = { ...(existing.tokensByIssuer ?? {}) };
  delete tokensByIssuer[normalizedIssuer];

  if (Object.keys(tokensByIssuer).length === 0) {
    await unlink(storePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
    return;
  }

  const tempPath = `${storePath}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify({ tokensByIssuer }, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  await rename(tempPath, storePath);
}
