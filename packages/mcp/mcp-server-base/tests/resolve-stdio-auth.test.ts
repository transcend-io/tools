import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  resolveStdioStartupAuth,
  resolveStdioStartupAuthOptional,
} from '../src/oauth/resolve-stdio-auth.js';

describe('resolveStdioStartupAuth', () => {
  const originalApiKey = process.env.TRANSCEND_API_KEY;
  const originalIssuer = process.env.TRANSCEND_OAUTH_ISSUER;
  const originalClientId = process.env.TRANSCEND_OAUTH_CLIENT_ID;
  const originalClientSecret = process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
  const originalRedirectPort = process.env.TRANSCEND_OAUTH_REDIRECT_PORT;

  beforeEach(() => {
    delete process.env.TRANSCEND_API_KEY;
    delete process.env.TRANSCEND_OAUTH_ISSUER;
    delete process.env.TRANSCEND_OAUTH_CLIENT_ID;
    delete process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
    delete process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
  });

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.TRANSCEND_API_KEY;
    else process.env.TRANSCEND_API_KEY = originalApiKey;

    if (originalIssuer === undefined) delete process.env.TRANSCEND_OAUTH_ISSUER;
    else process.env.TRANSCEND_OAUTH_ISSUER = originalIssuer;

    if (originalClientId === undefined) delete process.env.TRANSCEND_OAUTH_CLIENT_ID;
    else process.env.TRANSCEND_OAUTH_CLIENT_ID = originalClientId;

    if (originalClientSecret === undefined) delete process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
    else process.env.TRANSCEND_OAUTH_CLIENT_SECRET = originalClientSecret;

    if (originalRedirectPort === undefined) delete process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
    else process.env.TRANSCEND_OAUTH_REDIRECT_PORT = originalRedirectPort;
  });

  it('returns null when OAuth issuer and startup env are configured', () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';
    expect(resolveStdioStartupAuth()).toBeNull();
  });

  it('falls through to resolveAuth when OAuth client id is not configured', () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';
    expect(() => resolveStdioStartupAuth()).toThrow(/No authentication provided/);
  });

  it('throws when OAuth issuer is configured without client secret', () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';
    expect(() => resolveStdioStartupAuth()).toThrow(/TRANSCEND_OAUTH_CLIENT_SECRET/);
  });

  it('throws when OAuth issuer is configured without redirect port', () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    expect(() => resolveStdioStartupAuth()).toThrow(/TRANSCEND_OAUTH_REDIRECT_PORT/);
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

describe('resolveStdioStartupAuthOptional', () => {
  const originalApiKey = process.env.TRANSCEND_API_KEY;
  const originalIssuer = process.env.TRANSCEND_OAUTH_ISSUER;
  const originalClientId = process.env.TRANSCEND_OAUTH_CLIENT_ID;
  const originalClientSecret = process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
  const originalRedirectPort = process.env.TRANSCEND_OAUTH_REDIRECT_PORT;

  beforeEach(() => {
    delete process.env.TRANSCEND_API_KEY;
    delete process.env.TRANSCEND_OAUTH_ISSUER;
    delete process.env.TRANSCEND_OAUTH_CLIENT_ID;
    delete process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
    delete process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
  });

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.TRANSCEND_API_KEY;
    else process.env.TRANSCEND_API_KEY = originalApiKey;

    if (originalIssuer === undefined) delete process.env.TRANSCEND_OAUTH_ISSUER;
    else process.env.TRANSCEND_OAUTH_ISSUER = originalIssuer;

    if (originalClientId === undefined) delete process.env.TRANSCEND_OAUTH_CLIENT_ID;
    else process.env.TRANSCEND_OAUTH_CLIENT_ID = originalClientId;

    if (originalClientSecret === undefined) delete process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
    else process.env.TRANSCEND_OAUTH_CLIENT_SECRET = originalClientSecret;

    if (originalRedirectPort === undefined) delete process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
    else process.env.TRANSCEND_OAUTH_REDIRECT_PORT = originalRedirectPort;
  });

  it('returns null in API-key mode when no credentials are configured', () => {
    expect(resolveStdioStartupAuthOptional()).toBeNull();
  });

  it('returns API key credentials when TRANSCEND_API_KEY is set', () => {
    process.env.TRANSCEND_API_KEY = 'test-api-key';
    expect(resolveStdioStartupAuthOptional()).toEqual({ type: 'apiKey', apiKey: 'test-api-key' });
  });

  it('returns null in OAuth mode after validating startup env', () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';
    expect(resolveStdioStartupAuthOptional()).toBeNull();
  });
});
