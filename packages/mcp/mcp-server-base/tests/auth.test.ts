import { describe, it, expect } from 'vitest';

import { authHeaders, type AuthCredentials } from '../src/auth.js';
import { TRANSCEND_ACTIVE_ORG_ID_HEADER } from '../src/http-header-names.js';

describe('authHeaders', () => {
  it('produces Authorization header for API key auth', () => {
    const creds: AuthCredentials = { type: 'apiKey', apiKey: 'my-api-key' };
    expect(authHeaders(creds)).toEqual({
      Authorization: 'Bearer my-api-key',
    });
  });

  it('produces Cookie and org ID headers for session cookie auth', () => {
    const creds: AuthCredentials = {
      type: 'sessionCookie',
      cookie: 'laravel_session=abc123',
      organizationId: 'org-uuid-456',
    };
    expect(authHeaders(creds)).toEqual({
      Cookie: 'laravel_session=abc123',
      [TRANSCEND_ACTIVE_ORG_ID_HEADER]: 'org-uuid-456',
    });
  });

  it('does not include Cookie header for API key auth', () => {
    const creds: AuthCredentials = { type: 'apiKey', apiKey: 'key' };
    const headers = authHeaders(creds);
    expect(headers).not.toHaveProperty('Cookie');
    expect(headers).not.toHaveProperty(TRANSCEND_ACTIVE_ORG_ID_HEADER);
  });

  it('does not include Authorization header for session cookie auth', () => {
    const creds: AuthCredentials = {
      type: 'sessionCookie',
      cookie: 'laravel_session=xyz',
      organizationId: 'org-id',
    };
    const headers = authHeaders(creds);
    expect(headers).not.toHaveProperty('Authorization');
  });
});
