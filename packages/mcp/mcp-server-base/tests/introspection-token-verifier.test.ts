import { describe, expect, it, vi } from 'vitest';

import type { Logger } from '../src/clients/graphql/base.js';
import {
  createIntrospectionTokenVerifier,
  TokenVerificationStatus,
} from '../src/server/introspection-token-verifier.js';

const AUTHORIZATION_SERVER = 'https://api.example.com';
const METADATA_URL = `${AUTHORIZATION_SERVER}/.well-known/oauth-authorization-server`;
const INTROSPECTION_URL = `${AUTHORIZATION_SERVER}/oauth/introspect`;
const RESOURCE = 'https://mcp.example.com/mcp';
const NOW_MS = Date.parse('2026-01-01T00:00:00Z');

const METADATA = {
  issuer: AUTHORIZATION_SERVER,
  authorization_endpoint: `${AUTHORIZATION_SERVER}/oauth/authorize`,
  token_endpoint: `${AUTHORIZATION_SERVER}/oauth/token`,
  introspection_endpoint: INTROSPECTION_URL,
  code_challenge_methods_supported: ['S256'],
};

const ACTIVE_TOKEN = {
  active: true,
  exp: NOW_MS / 1000 + 3600,
  aud: RESOURCE,
  client_id: 'chat-client',
  sub: 'user-1',
  scope: 'read:things',
};

type FetchHandler = (url: string, init?: RequestInit) => Response | Promise<Response>;

/** Builds a verifier whose authorization server is played by the given handlers. */
function setup({
  metadata = () => Response.json(METADATA),
  introspect = () => Response.json(ACTIVE_TOKEN),
}: {
  /** Answers the metadata request */
  metadata?: FetchHandler;
  /** Answers the introspection request */
  introspect?: FetchHandler;
} = {}) {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    return url === METADATA_URL ? metadata(url, init) : introspect(url, init);
  });
  const logger = { error: vi.fn() } as unknown as Logger;
  const verify = createIntrospectionTokenVerifier({
    authorizationServerUrl: AUTHORIZATION_SERVER,
    clientId: 'mcp-resource-server',
    clientSecret: 's3cret',
    resource: RESOURCE,
    logger,
    now: () => NOW_MS,
    fetch: fetchMock as typeof fetch,
  });
  const callsTo = (url: string): Array<RequestInit | undefined> =>
    fetchMock.mock.calls.filter(([input]) => String(input) === url).map(([, init]) => init);
  return { verify, logger, callsTo };
}

describe('createIntrospectionTokenVerifier', () => {
  it('returns what the authorization server says about a valid token', async () => {
    const { verify } = setup();

    await expect(verify('good-token')).resolves.toEqual({
      status: TokenVerificationStatus.Valid,
      token: {
        expiresAt: NOW_MS + 3_600_000,
        clientId: 'chat-client',
        subject: 'user-1',
        scope: 'read:things',
      },
    });
  });

  it('posts the token as a form to the endpoint named in the server metadata', async () => {
    const { verify, callsTo } = setup();

    await verify('good-token');

    const [request] = callsTo(INTROSPECTION_URL);
    expect(request?.method).toBe('POST');
    expect(String(request?.body)).toBe('token=good-token&token_type_hint=access_token');
    expect(request?.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from('mcp-resource-server:s3cret').toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    });
  });

  it('reads the server metadata once', async () => {
    const { verify, callsTo } = setup();

    await verify('token-a');
    await verify('token-b');

    expect(callsTo(METADATA_URL)).toHaveLength(1);
    expect(callsTo(INTROSPECTION_URL)).toHaveLength(2);
  });

  it('bounds every call to the authorization server with a timeout', async () => {
    const { verify, callsTo } = setup();

    await verify('good-token');

    expect(callsTo(METADATA_URL)[0]?.signal).toBeInstanceOf(AbortSignal);
    expect(callsTo(INTROSPECTION_URL)[0]?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each<[string, Parameters<typeof setup>[0]]>([
    [
      'the introspection call fails on the network',
      { introspect: () => Promise.reject(new TypeError('fetch failed')) },
    ],
    [
      'the introspection endpoint answers 500',
      { introspect: () => new Response('boom', { status: 500 }) },
    ],
    [
      'the introspection endpoint rejects the client credentials',
      { introspect: () => Response.json({ error: 'invalid_client' }, { status: 401 }) },
    ],
    ['the introspection response is not JSON', { introspect: () => new Response('<html>') }],
    [
      'the introspection response has no boolean `active`',
      { introspect: () => Response.json({ active: 'true' }) },
    ],
    [
      'the server metadata cannot be fetched',
      { metadata: () => new Response('boom', { status: 503 }) },
    ],
    [
      'the server metadata names no introspection endpoint',
      { metadata: () => Response.json({ ...METADATA, introspection_endpoint: undefined }) },
    ],
  ])('reports an outage, not a verdict, when %s', async (_label, handlers) => {
    const { verify, logger } = setup(handlers);

    await expect(verify('good-token')).resolves.toEqual({
      status: TokenVerificationStatus.Unavailable,
    });
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('recovers once the server metadata is reachable again', async () => {
    let metadataDown = true;
    const { verify } = setup({
      metadata: () =>
        metadataDown ? new Response('boom', { status: 503 }) : Response.json(METADATA),
    });

    await expect(verify('good-token')).resolves.toMatchObject({
      status: TokenVerificationStatus.Unavailable,
    });
    metadataDown = false;
    await expect(verify('good-token')).resolves.toMatchObject({
      status: TokenVerificationStatus.Valid,
    });
  });

  it('keeps tokens apart in the cache', async () => {
    const { verify } = setup({
      introspect: (_url, init) =>
        Response.json(
          String(init?.body).startsWith('token=good-token&') ? ACTIVE_TOKEN : { active: false },
        ),
    });

    await verify('good-token');

    await expect(verify('good-token-with-a-suffix')).resolves.toEqual({
      status: TokenVerificationStatus.Invalid,
    });
  });

  it('does not log the access token', async () => {
    const { verify, logger } = setup({
      introspect: () => Promise.reject(new TypeError('fetch failed')),
    });

    await verify('secret-access-token');

    const logged = vi
      .mocked(logger.error)
      .mock.calls.flat()
      .map((value) => (value instanceof Error ? `${value.message} ${value.stack}` : String(value)))
      .join(' ');
    expect(logged).toContain('fetch failed');
    expect(logged).not.toContain('secret-access-token');
  });
});
