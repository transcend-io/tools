import { describe, expect, it } from 'vitest';

import { requestAuthContext } from '../src/auth-context.js';
import { TranscendGraphQLBase } from '../src/clients/graphql/base.js';
import { createGraphqlRequestClient } from '../src/clients/graphql/graphql-request-client.js';
import { ErrorCode, ToolError } from '../src/errors.js';
import { TRANSCEND_ACTIVE_ORG_ID_HEADER } from '../src/http-header-names.js';

const BASE_URL = 'https://api.example.test';

describe('createGraphqlRequestClient', () => {
  it('uses the base url and bearer auth', () => {
    const base = new TranscendGraphQLBase({ type: 'apiKey', apiKey: 'key-1' }, BASE_URL);
    const client = createGraphqlRequestClient(base);

    expect(client.requestConfig.headers).toMatchObject({ Authorization: 'Bearer key-1' });
    expect(base.getBaseUrl()).toBe(BASE_URL);
  });

  it('forwards the session cookie and organization id from request auth', () => {
    const base = new TranscendGraphQLBase(null, BASE_URL);

    const headers = requestAuthContext.run(
      { type: 'sessionCookie', cookie: 'sid=abc', organizationId: 'org-1' },
      () => createGraphqlRequestClient(base).requestConfig.headers,
    );

    expect(headers).toMatchObject({
      Cookie: 'sid=abc',
      [TRANSCEND_ACTIVE_ORG_ID_HEADER]: 'org-1',
    });
  });

  it('throws an auth error when no credentials exist', () => {
    const base = new TranscendGraphQLBase(null, BASE_URL);

    let caught: unknown;
    try {
      createGraphqlRequestClient(base);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ToolError);
    expect((caught as ToolError).code).toBe(ErrorCode.AUTH_ERROR);
  });
});
