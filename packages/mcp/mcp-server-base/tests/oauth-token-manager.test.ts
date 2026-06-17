import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import * as metadata from '../src/oauth/metadata.js';
import {
  getActiveStoredOAuthTokens,
  getValidOAuthCredentials,
  resetOAuthTokenManagerState,
  setActiveStoredOAuthTokens,
} from '../src/oauth/token-manager.js';
import * as tokenRefresh from '../src/oauth/token-refresh.js';
import { storedTokensFromTokenResponse } from '../src/oauth/token-store.js';

describe('getValidOAuthCredentials', () => {
  const logger = new SimpleLogger();
  const issuer = 'https://yo.com:4001';

  beforeEach(() => {
    resetOAuthTokenManagerState();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetOAuthTokenManagerState();
  });

  it('returns cached credentials when the access token is still valid', async () => {
    const now = Date.now();
    setActiveStoredOAuthTokens(
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
    setActiveStoredOAuthTokens(expired);

    vi.spyOn(metadata, 'fetchAuthorizationServerMetadata').mockResolvedValue({
      issuer,
      authorizationEndpoint: `${issuer}/oauth/authorize`,
      tokenEndpoint: `${issuer}/oauth/token`,
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

    expect(getActiveStoredOAuthTokens()?.accessToken).toBe('refreshed-access');
  });

  it('clears session tokens and returns null when refresh fails', async () => {
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
    setActiveStoredOAuthTokens(expired);

    vi.spyOn(metadata, 'fetchAuthorizationServerMetadata').mockResolvedValue({
      issuer,
      authorizationEndpoint: `${issuer}/oauth/authorize`,
      tokenEndpoint: `${issuer}/oauth/token`,
      codeChallengeMethodsSupported: ['S256'],
    });
    vi.spyOn(tokenRefresh, 'refreshOAuthTokens').mockRejectedValue(
      new Error('OAuth token refresh failed: HTTP 400 — invalid_grant'),
    );

    const credentials = await getValidOAuthCredentials(issuer, logger, expired.expiresAt + 1);
    expect(credentials).toBeNull();
    expect(getActiveStoredOAuthTokens()).toBeNull();
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
    setActiveStoredOAuthTokens(expired);

    vi.spyOn(metadata, 'fetchAuthorizationServerMetadata').mockResolvedValue({
      issuer,
      authorizationEndpoint: `${issuer}/oauth/authorize`,
      tokenEndpoint: `${issuer}/oauth/token`,
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
