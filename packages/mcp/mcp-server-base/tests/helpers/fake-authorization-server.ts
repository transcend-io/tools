import { setTimeout as sleep } from 'node:timers/promises';

import { storedTokensFromTokenResponse } from '../../src/oauth/token-store.js';
import type { StoredOAuthTokens } from '../../src/oauth/types.js';

/** Access token lifetime the fake server grants, in seconds. */
export const FAKE_ACCESS_TOKEN_LIFETIME_SECONDS = 600;

export interface FakeAuthorizationServerOptions {
  /** Issuer URL the server answers for */
  issuer: string;
  /** The one registered client */
  clientId: string;
  /** Secret of the registered client */
  clientSecret: string;
  /** How long a refresh takes, so overlapping requests really overlap */
  refreshDelayMs?: number;
}

/** Answers one request in place of the normal handler; may throw like a failed `fetch`. */
type Responder = () => Response;

/**
 * An authorization server with one grant, in memory.
 *
 * It rotates the refresh token on every refresh and revokes the grant when a
 * spent refresh token comes back, as the Transcend server does for MCP clients.
 */
export interface FakeAuthorizationServer {
  /** `fetch` that reaches this server and nothing else */
  fetch: typeof fetch;
  /** Starts a new grant, as a completed browser sign-in would */
  signIn: (nowMs: number) => StoredOAuthTokens;
  /** Ends the grant, as an administrator or an expiry would */
  revokeGrant: () => void;
  /** Whether the grant has been revoked */
  isGrantRevoked: () => boolean;
  /** Refresh requests received, including failed ones */
  refreshRequestCount: () => number;
  /** Tokens presented to the revocation endpoint */
  revokedTokens: () => string[];
  /** Makes the next refresh request fail the given way */
  failNextRefresh: (responder: Responder) => void;
  /** Makes the next revocation request fail the given way */
  failNextRevocation: (responder: Responder) => void;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Creates a {@link FakeAuthorizationServer}.
 */
export function createFakeAuthorizationServer(
  options: FakeAuthorizationServerOptions,
): FakeAuthorizationServer {
  const { issuer, clientId, clientSecret, refreshDelayMs = 0 } = options;
  const basicCredentials = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

  let generation = 0;
  let currentRefreshToken: string | null = null;
  let isGrantRevoked = false;
  let refreshRequestCount = 0;
  const spentRefreshTokens = new Set<string>();
  const revokedTokens: string[] = [];
  const refreshFailures: Responder[] = [];
  const revocationFailures: Responder[] = [];

  const issueTokens = (): {
    /** New access token */
    access_token: string;
    /** New refresh token; the previous one is now spent */
    refresh_token: string;
    /** Access token lifetime in seconds */
    expires_in: number;
  } => {
    generation += 1;
    currentRefreshToken = `refresh-${generation}`;
    return {
      access_token: `access-${generation}`,
      refresh_token: currentRefreshToken,
      expires_in: FAKE_ACCESS_TOKEN_LIFETIME_SECONDS,
    };
  };

  const handleRefresh = async (form: URLSearchParams): Promise<Response> => {
    refreshRequestCount += 1;
    const failure = refreshFailures.shift();
    if (failure) return failure();

    if (form.get('client_id') !== clientId || form.get('client_secret') !== clientSecret) {
      return jsonResponse(401, { error: 'invalid_client' });
    }
    const presented = form.get('refresh_token') ?? '';
    if (spentRefreshTokens.has(presented)) isGrantRevoked = true;
    if (isGrantRevoked || presented !== currentRefreshToken) {
      return jsonResponse(400, { error: 'invalid_grant' });
    }
    spentRefreshTokens.add(presented);
    const tokens = issueTokens();
    await sleep(refreshDelayMs);
    return jsonResponse(200, tokens);
  };

  const handleRevocation = (form: URLSearchParams, headers: Headers): Response => {
    const failure = revocationFailures.shift();
    if (failure) return failure();

    if (headers.get('Authorization') !== basicCredentials) {
      return jsonResponse(401, { error: 'invalid_client' });
    }
    const token = form.get('token') ?? '';
    revokedTokens.push(token);
    if (token === currentRefreshToken) isGrantRevoked = true;
    return new Response(null, { status: 200 });
  };

  return {
    fetch: async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      const form = new URLSearchParams(String(init?.body ?? ''));
      switch (url) {
        case `${issuer}/.well-known/oauth-authorization-server`:
          return jsonResponse(200, {
            issuer,
            authorization_endpoint: `${issuer}/oauth/authorize`,
            token_endpoint: `${issuer}/oauth/token`,
            revocation_endpoint: `${issuer}/oauth/revoke`,
            code_challenge_methods_supported: ['S256'],
          });
        case `${issuer}/oauth/token`:
          return handleRefresh(form);
        case `${issuer}/oauth/revoke`:
          return handleRevocation(form, new Headers(init?.headers));
        default:
          throw new TypeError(`fetch failed: nothing answers at ${url}`);
      }
    },
    signIn: (nowMs) => {
      isGrantRevoked = false;
      return storedTokensFromTokenResponse({ response: issueTokens(), issuer, clientId, nowMs });
    },
    revokeGrant: () => {
      isGrantRevoked = true;
    },
    isGrantRevoked: () => isGrantRevoked,
    refreshRequestCount: () => refreshRequestCount,
    revokedTokens: () => [...revokedTokens],
    failNextRefresh: (responder) => {
      refreshFailures.push(responder);
    },
    failNextRevocation: (responder) => {
      revocationFailures.push(responder);
    },
  };
}
