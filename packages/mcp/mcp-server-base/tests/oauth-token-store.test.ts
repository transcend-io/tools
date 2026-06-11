import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV } from '../src/oauth/constants.js';
import {
  clearStoredOAuthTokens,
  computeOAuthExpiresAt,
  getOAuthTokenStorePath,
  isStoredOAuthTokenValid,
  loadValidOAuthCredentials,
  loadValidOAuthCredentialsSync,
  readStoredOAuthTokens,
  storedOAuthTokensToAuth,
  storedTokensFromRefreshResponse,
  storedTokensFromTokenResponse,
  writeStoredOAuthTokens,
} from '../src/oauth/token-store.js';

describe('token-store', () => {
  let tempDir = '';
  const originalStorePath = process.env[TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV];

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'transcend-oauth-store-'));
    process.env[TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV] = path.join(tempDir, 'tokens.json');
  });

  afterEach(async () => {
    if (originalStorePath === undefined) {
      delete process.env[TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV];
    } else {
      process.env[TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV] = originalStorePath;
    }
    await rm(tempDir, { recursive: true, force: true });
  });

  it('preserves the prior refresh token when the refresh response omits one', () => {
    const previous = storedTokensFromTokenResponse({
      response: {
        access_token: 'old-access',
        refresh_token: 'refresh-token',
        expires_in: 60,
      },
      issuer: 'https://yo.com:4001',
      clientId: 'client-abc',
      nowMs: 1_700_000_000_000,
    });

    const refreshed = storedTokensFromRefreshResponse({
      response: { access_token: 'new-access', expires_in: 3600 },
      previous,
      nowMs: 1_700_000_100_000,
    });

    expect(refreshed.accessToken).toBe('new-access');
    expect(refreshed.refreshToken).toBe('refresh-token');
  });

  it('computes expiresAt with a 60-second skew buffer', () => {
    const now = 1_700_000_000_000;
    expect(computeOAuthExpiresAt(3600, now)).toBe(now + (3600 - 60) * 1000);
  });

  it('writes and reads tokens keyed by issuer', async () => {
    const tokens = storedTokensFromTokenResponse({
      response: {
        access_token: 'access-123',
        refresh_token: 'refresh-456',
        expires_in: 3600,
        scope: 'offline_access viewAllActionItems',
      },
      issuer: 'https://yo.com:4001/',
      clientId: 'client-abc',
      nowMs: 1_700_000_000_000,
    });

    await writeStoredOAuthTokens(tokens);

    expect(getOAuthTokenStorePath()).toBe(path.join(tempDir, 'tokens.json'));
    const stored = await readStoredOAuthTokens('https://yo.com:4001');
    expect(stored).toEqual({
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      expiresAt: 1_700_000_000_000 + (3600 - 60) * 1000,
      scope: 'offline_access viewAllActionItems',
      issuer: 'https://yo.com:4001',
      clientId: 'client-abc',
    });

    const raw = JSON.parse(await readFile(getOAuthTokenStorePath(), 'utf8')) as {
      tokensByIssuer: Record<string, unknown>;
    };
    expect(Object.keys(raw.tokensByIssuer)).toEqual(['https://yo.com:4001']);
  });

  it('loads valid credentials and rejects expired tokens', async () => {
    const valid = storedTokensFromTokenResponse({
      response: { access_token: 'access-123', expires_in: 3600 },
      issuer: 'https://yo.com:4001',
      clientId: 'client-abc',
      nowMs: 1_700_000_000_000,
    });
    await writeStoredOAuthTokens(valid);

    const loaded = await loadValidOAuthCredentials('https://yo.com:4001', 1_700_000_000_000);
    expect(loaded).toEqual(storedOAuthTokensToAuth(valid));

    const expired = storedTokensFromTokenResponse({
      response: { access_token: 'expired', expires_in: 60 },
      issuer: 'https://yo.com:4001',
      clientId: 'client-abc',
      nowMs: 1_700_000_000_000,
    });
    expect(isStoredOAuthTokenValid(expired, expired.expiresAt + 1)).toBe(false);

    await writeStoredOAuthTokens(expired);
    expect(loadValidOAuthCredentialsSync('https://yo.com:4001', expired.expiresAt + 1)).toBeNull();

    await clearStoredOAuthTokens('https://yo.com:4001');
    expect(await readStoredOAuthTokens('https://yo.com:4001')).toBeNull();
  });
});
