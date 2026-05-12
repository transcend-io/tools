import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  TRANSCEND_ACTIVE_ORG_ID_HEADER,
  TRANSCEND_API_KEY_HEADER,
} from '../src/http-header-names.js';
import {
  resolveAuth,
  tryResolveAuth,
  extractApiKeyFromHeaders,
} from '../src/server/resolve-auth.js';

describe('extractApiKeyFromHeaders', () => {
  it('extracts key from Authorization: Bearer header', () => {
    const key = extractApiKeyFromHeaders({ authorization: 'Bearer my-key' });
    expect(key).toBe('my-key');
  });

  it('extracts key from X-Transcend-Api-Key header', () => {
    const key = extractApiKeyFromHeaders({ [TRANSCEND_API_KEY_HEADER]: 'my-key' });
    expect(key).toBe('my-key');
  });

  it('prefers Authorization header over X-Transcend-Api-Key', () => {
    const key = extractApiKeyFromHeaders({
      authorization: 'Bearer auth-key',
      [TRANSCEND_API_KEY_HEADER]: 'header-key',
    });
    expect(key).toBe('auth-key');
  });

  it('returns undefined when no auth headers present', () => {
    const key = extractApiKeyFromHeaders({ 'content-type': 'application/json' });
    expect(key).toBeUndefined();
  });

  it('ignores non-Bearer Authorization headers', () => {
    const key = extractApiKeyFromHeaders({ authorization: 'Basic abc123' });
    expect(key).toBeUndefined();
  });
});

describe('resolveAuth', () => {
  let savedApiKey: string | undefined;

  beforeEach(() => {
    savedApiKey = process.env.TRANSCEND_API_KEY;
    delete process.env.TRANSCEND_API_KEY;
  });

  afterEach(() => {
    if (savedApiKey !== undefined) {
      process.env.TRANSCEND_API_KEY = savedApiKey;
    } else {
      delete process.env.TRANSCEND_API_KEY;
    }
  });

  it('returns sessionCookie credentials when Cookie and org ID headers are present', () => {
    const auth = resolveAuth({
      cookie: 'laravel_session=abc123',
      [TRANSCEND_ACTIVE_ORG_ID_HEADER]: 'org-uuid',
    });
    expect(auth).toEqual({
      type: 'sessionCookie',
      cookie: 'laravel_session=abc123',
      organizationId: 'org-uuid',
    });
  });

  it('returns apiKey credentials from Authorization header', () => {
    const auth = resolveAuth({ authorization: 'Bearer my-api-key' });
    expect(auth).toEqual({ type: 'apiKey', apiKey: 'my-api-key' });
  });

  it('returns apiKey credentials from X-Transcend-Api-Key header', () => {
    const auth = resolveAuth({ [TRANSCEND_API_KEY_HEADER]: 'header-key' });
    expect(auth).toEqual({ type: 'apiKey', apiKey: 'header-key' });
  });

  it('returns apiKey credentials from env var when no headers', () => {
    process.env.TRANSCEND_API_KEY = 'env-key';
    const auth = resolveAuth();
    expect(auth).toEqual({ type: 'apiKey', apiKey: 'env-key' });
  });

  it('returns apiKey from env var when headers have no auth', () => {
    process.env.TRANSCEND_API_KEY = 'env-key';
    const auth = resolveAuth({ 'content-type': 'application/json' });
    expect(auth).toEqual({ type: 'apiKey', apiKey: 'env-key' });
  });

  it('throws when no auth is available', () => {
    expect(() => resolveAuth()).toThrow(/No authentication provided/);
  });

  it('throws when headers have no auth and no env var', () => {
    expect(() => resolveAuth({ 'content-type': 'application/json' })).toThrow(
      /No authentication provided/,
    );
  });

  it('falls through to API key when cookie is present but org ID is missing', () => {
    process.env.TRANSCEND_API_KEY = 'fallback-key';
    const auth = resolveAuth({ cookie: 'laravel_session=abc123' });
    expect(auth).toEqual({ type: 'apiKey', apiKey: 'fallback-key' });
  });

  it('prefers session cookie over API key header when both are present', () => {
    const auth = resolveAuth({
      cookie: 'laravel_session=abc123',
      [TRANSCEND_ACTIVE_ORG_ID_HEADER]: 'org-uuid',
      authorization: 'Bearer api-key',
    });
    expect(auth).toEqual({
      type: 'sessionCookie',
      cookie: 'laravel_session=abc123',
      organizationId: 'org-uuid',
    });
  });

  it('falls through to API key header when cookie has no org ID', () => {
    const auth = resolveAuth({
      cookie: 'laravel_session=abc123',
      authorization: 'Bearer api-key',
    });
    expect(auth).toEqual({ type: 'apiKey', apiKey: 'api-key' });
  });
});

describe('tryResolveAuth', () => {
  let savedApiKey: string | undefined;

  beforeEach(() => {
    savedApiKey = process.env.TRANSCEND_API_KEY;
    delete process.env.TRANSCEND_API_KEY;
  });

  afterEach(() => {
    if (savedApiKey !== undefined) {
      process.env.TRANSCEND_API_KEY = savedApiKey;
    } else {
      delete process.env.TRANSCEND_API_KEY;
    }
  });

  it('returns null when no auth is available', () => {
    expect(tryResolveAuth()).toBeNull();
  });

  it('returns null when headers have no auth and no env var', () => {
    expect(tryResolveAuth({ 'content-type': 'application/json' })).toBeNull();
  });

  it('returns sessionCookie credentials when cookie + org ID present', () => {
    const auth = tryResolveAuth({
      cookie: 'laravel_session=abc123',
      [TRANSCEND_ACTIVE_ORG_ID_HEADER]: 'org-uuid',
    });
    expect(auth).toEqual({
      type: 'sessionCookie',
      cookie: 'laravel_session=abc123',
      organizationId: 'org-uuid',
    });
  });

  it('returns apiKey from env var as fallback', () => {
    process.env.TRANSCEND_API_KEY = 'env-key';
    expect(tryResolveAuth()).toEqual({ type: 'apiKey', apiKey: 'env-key' });
  });
});
