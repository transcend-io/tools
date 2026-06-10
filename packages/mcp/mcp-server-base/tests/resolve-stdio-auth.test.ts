import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveStdioStartupAuth } from '../src/oauth/resolve-stdio-auth.js';

describe('resolveStdioStartupAuth', () => {
  const originalApiKey = process.env.TRANSCEND_API_KEY;
  const originalIssuer = process.env.TRANSCEND_OAUTH_ISSUER;

  beforeEach(() => {
    delete process.env.TRANSCEND_API_KEY;
    delete process.env.TRANSCEND_OAUTH_ISSUER;
  });

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.TRANSCEND_API_KEY;
    else process.env.TRANSCEND_API_KEY = originalApiKey;

    if (originalIssuer === undefined) delete process.env.TRANSCEND_OAUTH_ISSUER;
    else process.env.TRANSCEND_OAUTH_ISSUER = originalIssuer;
  });

  it('returns null when OAuth issuer is configured without an API key', () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    expect(resolveStdioStartupAuth()).toBeNull();
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
