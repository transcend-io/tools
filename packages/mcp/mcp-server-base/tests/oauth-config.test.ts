import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getOAuthRedirectHost,
  getOAuthRedirectUri,
  requireOAuthStartupEnv,
} from '../src/oauth/config.js';
import { OAUTH_CLIENTS_ADMIN_URL } from '../src/oauth/constants.js';

describe('OAuth redirect config', () => {
  const originalIssuer = process.env.TRANSCEND_OAUTH_ISSUER;
  const originalApiKey = process.env.TRANSCEND_API_KEY;
  const originalClientId = process.env.TRANSCEND_OAUTH_CLIENT_ID;
  const originalClientSecret = process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
  const originalRedirectPort = process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
  const originalRedirectHost = process.env.TRANSCEND_OAUTH_REDIRECT_HOST;

  beforeEach(() => {
    delete process.env.TRANSCEND_OAUTH_ISSUER;
    delete process.env.TRANSCEND_API_KEY;
    delete process.env.TRANSCEND_OAUTH_CLIENT_ID;
    delete process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
    delete process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
    delete process.env.TRANSCEND_OAUTH_REDIRECT_HOST;
  });

  afterEach(() => {
    if (originalIssuer === undefined) delete process.env.TRANSCEND_OAUTH_ISSUER;
    else process.env.TRANSCEND_OAUTH_ISSUER = originalIssuer;

    if (originalApiKey === undefined) delete process.env.TRANSCEND_API_KEY;
    else process.env.TRANSCEND_API_KEY = originalApiKey;

    if (originalClientId === undefined) delete process.env.TRANSCEND_OAUTH_CLIENT_ID;
    else process.env.TRANSCEND_OAUTH_CLIENT_ID = originalClientId;

    if (originalClientSecret === undefined) delete process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
    else process.env.TRANSCEND_OAUTH_CLIENT_SECRET = originalClientSecret;

    if (originalRedirectPort === undefined) delete process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
    else process.env.TRANSCEND_OAUTH_REDIRECT_PORT = originalRedirectPort;

    if (originalRedirectHost === undefined) delete process.env.TRANSCEND_OAUTH_REDIRECT_HOST;
    else process.env.TRANSCEND_OAUTH_REDIRECT_HOST = originalRedirectHost;
  });

  it('defaults redirect host to 127.0.0.1', () => {
    expect(getOAuthRedirectHost()).toBe('127.0.0.1');
  });

  it('accepts ::1 as redirect host', () => {
    process.env.TRANSCEND_OAUTH_REDIRECT_HOST = '::1';
    expect(getOAuthRedirectHost()).toBe('::1');
  });

  it('strips brackets from [::1] redirect host', () => {
    process.env.TRANSCEND_OAUTH_REDIRECT_HOST = '[::1]';
    expect(getOAuthRedirectHost()).toBe('::1');
  });

  it('builds IPv4 redirect URI by default', () => {
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '5555';
    expect(getOAuthRedirectUri()).toBe('http://127.0.0.1:5555/callback');
  });

  it('builds IPv6 redirect URI when host is ::1', () => {
    process.env.TRANSCEND_OAUTH_REDIRECT_HOST = '::1';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '5555';
    expect(getOAuthRedirectUri()).toBe('http://[::1]:5555/callback');
  });

  it('rejects unsupported redirect hosts', () => {
    process.env.TRANSCEND_OAUTH_REDIRECT_HOST = 'localhost';
    expect(() => getOAuthRedirectHost()).toThrow(/loopback address/i);
  });

  it('validates redirect host during OAuth startup env checks', () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '5555';
    process.env.TRANSCEND_OAUTH_REDIRECT_HOST = 'example.com';

    expect(() => requireOAuthStartupEnv()).toThrow(/TRANSCEND_OAUTH_REDIRECT_HOST/);
    expect(() => requireOAuthStartupEnv()).toThrow(OAUTH_CLIENTS_ADMIN_URL);
  });

  it('includes admin URL when client id is missing', () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '5555';

    expect(() => requireOAuthStartupEnv()).toThrow(/TRANSCEND_OAUTH_CLIENT_ID/);
    expect(() => requireOAuthStartupEnv()).toThrow(OAUTH_CLIENTS_ADMIN_URL);
  });

  it('includes admin URL when client secret is missing', () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '5555';

    expect(() => requireOAuthStartupEnv()).toThrow(/TRANSCEND_OAUTH_CLIENT_SECRET/);
    expect(() => requireOAuthStartupEnv()).toThrow(OAUTH_CLIENTS_ADMIN_URL);
  });
});
