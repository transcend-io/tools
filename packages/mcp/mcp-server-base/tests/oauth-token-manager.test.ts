import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import { TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV } from '../src/oauth/constants.js';
import * as metadata from '../src/oauth/metadata.js';
import {
  getValidOAuthCredentials,
  resetOAuthTokenManagerState,
} from '../src/oauth/token-manager.js';
import * as tokenRefresh from '../src/oauth/token-refresh.js';
import {
  readStoredOAuthTokens,
  storedTokensFromTokenResponse,
  writeStoredOAuthTokens,
} from '../src/oauth/token-store.js';

describe('getValidOAuthCredentials', () => {
  const logger = new SimpleLogger();
  const issuer = 'https://yo.com:4001';
  const originalStorePath = process.env[TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV];
  let tempDir = '';

  beforeEach(async () => {
    resetOAuthTokenManagerState();
    vi.restoreAllMocks();
    tempDir = await mkdtemp(path.join(tmpdir(), 'transcend-oauth-manager-'));
    process.env[TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV] = path.join(tempDir, 'tokens.json');
  });

  afterEach(async () => {
    resetOAuthTokenManagerState();
    if (originalStorePath === undefined) {
      delete process.env[TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV];
    } else {
      process.env[TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV] = originalStorePath;
    }
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns cached credentials when the access token is still valid', async () => {
    const now = Date.now();
    await writeStoredOAuthTokens(
      storedTokensFromTokenResponse({
        response: { access_token: 'valid-access', expires_in: 3600 },
        issuer,
        clientId: 'client',
        nowMs: now,
      }),
    );

    const credentials = await getValidOAuthCredentials(issuer, logger, now);
    expect(credentials).toMatchObject({
      type: 'oauthToken',
      accessToken: 'valid-access',
    });
  });

  it('refreshes expired tokens without opening the browser', async () => {
    const now = 1_700_000_000_000;
    const expired = storedTokensFromTokenResponse({
      response: {
        access_token: 'expired-access',
        refresh_token: 'refresh-token',
        expires_in: 60,
      },
      issuer,
      clientId: 'client',
      nowMs: now,
    });
    await writeStoredOAuthTokens(expired);

    vi.spyOn(metadata, 'fetchAuthorizationServerMetadata').mockResolvedValue({
      issuer,
      authorizationEndpoint: `${issuer}/oauth/authorize`,
      tokenEndpoint: `${issuer}/oauth/token`,
      registrationEndpoint: `${issuer}/oauth/register`,
      codeChallengeMethodsSupported: ['S256'],
    });
    vi.spyOn(tokenRefresh, 'refreshOAuthTokens').mockResolvedValue(
      storedTokensFromTokenResponse({
        response: {
          access_token: 'refreshed-access',
          refresh_token: 'refresh-token',
          expires_in: 3600,
        },
        issuer,
        clientId: 'client',
        nowMs: expired.expiresAt + 1,
      }),
    );

    const credentials = await getValidOAuthCredentials(issuer, logger, expired.expiresAt + 1);
    expect(credentials).toMatchObject({
      type: 'oauthToken',
      accessToken: 'refreshed-access',
      refreshToken: 'refresh-token',
    });

    const stored = await readStoredOAuthTokens(issuer);
    expect(stored?.accessToken).toBe('refreshed-access');
  });

  it('clears stored tokens and returns null when refresh fails', async () => {
    const now = 1_700_000_000_000;
    const expired = storedTokensFromTokenResponse({
      response: {
        access_token: 'expired-access',
        refresh_token: 'bad-refresh',
        expires_in: 60,
      },
      issuer,
      clientId: 'client',
      nowMs: now,
    });
    await writeStoredOAuthTokens(expired);

    vi.spyOn(metadata, 'fetchAuthorizationServerMetadata').mockResolvedValue({
      issuer,
      authorizationEndpoint: `${issuer}/oauth/authorize`,
      tokenEndpoint: `${issuer}/oauth/token`,
      registrationEndpoint: `${issuer}/oauth/register`,
      codeChallengeMethodsSupported: ['S256'],
    });
    vi.spyOn(tokenRefresh, 'refreshOAuthTokens').mockRejectedValue(
      new Error('OAuth token refresh failed: HTTP 400 — invalid_grant'),
    );

    const credentials = await getValidOAuthCredentials(issuer, logger, expired.expiresAt + 1);
    expect(credentials).toBeNull();
    expect(await readStoredOAuthTokens(issuer)).toBeNull();
  });

  it('deduplicates concurrent refresh attempts', async () => {
    const now = 1_700_000_000_000;
    const expired = storedTokensFromTokenResponse({
      response: {
        access_token: 'expired-access',
        refresh_token: 'refresh-token',
        expires_in: 60,
      },
      issuer,
      clientId: 'client',
      nowMs: now,
    });
    await writeStoredOAuthTokens(expired);

    vi.spyOn(metadata, 'fetchAuthorizationServerMetadata').mockResolvedValue({
      issuer,
      authorizationEndpoint: `${issuer}/oauth/authorize`,
      tokenEndpoint: `${issuer}/oauth/token`,
      registrationEndpoint: `${issuer}/oauth/register`,
      codeChallengeMethodsSupported: ['S256'],
    });

    let resolveRefresh:
      | ((value: ReturnType<typeof storedTokensFromTokenResponse>) => void)
      | undefined;
    const refreshSpy = vi.spyOn(tokenRefresh, 'refreshOAuthTokens').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const first = getValidOAuthCredentials(issuer, logger, expired.expiresAt + 1);
    const second = getValidOAuthCredentials(issuer, logger, expired.expiresAt + 1);
    await vi.waitFor(() => expect(resolveRefresh).toBeDefined());
    resolveRefresh!(
      storedTokensFromTokenResponse({
        response: {
          access_token: 'refreshed-access',
          refresh_token: 'refresh-token',
          expires_in: 3600,
        },
        issuer,
        clientId: 'client',
        nowMs: expired.expiresAt + 1,
      }),
    );

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult?.accessToken).toBe('refreshed-access');
    expect(secondResult?.accessToken).toBe('refreshed-access');
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });
});
