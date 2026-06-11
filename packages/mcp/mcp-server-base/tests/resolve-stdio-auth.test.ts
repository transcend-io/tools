import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV } from '../src/oauth/constants.js';
import { resolveStdioStartupAuth } from '../src/oauth/resolve-stdio-auth.js';
import { storedTokensFromTokenResponse, writeStoredOAuthTokens } from '../src/oauth/token-store.js';

describe('resolveStdioStartupAuth', () => {
  const originalApiKey = process.env.TRANSCEND_API_KEY;
  const originalIssuer = process.env.TRANSCEND_OAUTH_ISSUER;
  const originalStorePath = process.env[TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV];
  let tempDir = '';

  beforeEach(async () => {
    delete process.env.TRANSCEND_API_KEY;
    delete process.env.TRANSCEND_OAUTH_ISSUER;
    tempDir = await mkdtemp(path.join(tmpdir(), 'transcend-oauth-startup-'));
    process.env[TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV] = path.join(tempDir, 'tokens.json');
  });

  afterEach(async () => {
    if (originalApiKey === undefined) delete process.env.TRANSCEND_API_KEY;
    else process.env.TRANSCEND_API_KEY = originalApiKey;

    if (originalIssuer === undefined) delete process.env.TRANSCEND_OAUTH_ISSUER;
    else process.env.TRANSCEND_OAUTH_ISSUER = originalIssuer;

    if (originalStorePath === undefined) {
      delete process.env[TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV];
    } else {
      process.env[TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV] = originalStorePath;
    }

    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns null when OAuth issuer is configured without cached tokens', () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    expect(resolveStdioStartupAuth()).toBeNull();
  });

  it('returns cached OAuth credentials when valid tokens exist', async () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    const now = Date.now();
    await writeStoredOAuthTokens(
      storedTokensFromTokenResponse({
        response: {
          access_token: 'cached-access',
          refresh_token: 'cached-refresh',
          expires_in: 3600,
        },
        issuer: 'https://yo.com:4001',
        clientId: 'client',
        nowMs: now,
      }),
    );

    expect(resolveStdioStartupAuth()).toEqual({
      type: 'oauthToken',
      accessToken: 'cached-access',
      refreshToken: 'cached-refresh',
      expiresAt: now + (3600 - 60) * 1000,
    });
  });

  it('prefers API key auth when TRANSCEND_API_KEY is set', () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_API_KEY = 'test-api-key';
    expect(resolveStdioStartupAuth()).toEqual({ type: 'apiKey', apiKey: 'test-api-key' });
  });

  it('throws when neither OAuth issuer nor API key is configured', () => {
    expect(() => resolveStdioStartupAuth()).toThrow(/No authentication provided/);
  });
});
