import { createHash } from 'node:crypto';

import type { Logger } from '../clients/graphql/base.js';
import { fetchAuthorizationServerMetadata } from '../oauth/metadata.js';

/** Longest time a verified token is trusted before the authorization server is asked again. */
const MAX_CACHE_TTL_MS = 60_000;

/** Time allowed for one call to the authorization server. */
const AUTHORIZATION_SERVER_TIMEOUT_MS = 5_000;

/** Verified tokens kept in memory at once. */
const MAX_CACHED_TOKENS = 10_000;

/** Outcome of verifying one access token. */
export enum TokenVerificationStatus {
  /** The token is active, unexpired, and issued for this resource. */
  Valid = 'VALID',
  /** The token is inactive, expired, or issued for another resource. */
  Invalid = 'INVALID',
  /** The authorization server could not be asked, so the token is neither accepted nor rejected. */
  Unavailable = 'UNAVAILABLE',
}

/** Facts about an access token that the authorization server vouched for. */
export interface VerifiedAccessToken {
  /** Unix timestamp (ms) when the token expires */
  expiresAt: number;
  /** OAuth client the token was issued to */
  clientId?: string;
  /** User the token was issued for */
  subject?: string;
  /** Space-separated scopes granted to the token */
  scope?: string;
}

/** Result of {@link AccessTokenVerifier}. */
export type TokenVerification =
  | {
      /** The token passed every check */
      status: TokenVerificationStatus.Valid;
      /** Facts the authorization server returned about the token */
      token: VerifiedAccessToken;
    }
  | {
      /** The token failed a check, or could not be checked */
      status: TokenVerificationStatus.Invalid | TokenVerificationStatus.Unavailable;
    };

/** Verifies a Bearer access token. Never throws. */
export type AccessTokenVerifier = (accessToken: string) => Promise<TokenVerification>;

export interface IntrospectionTokenVerifierOptions {
  /** Authorization server that serves `/.well-known/oauth-authorization-server` */
  authorizationServerUrl: string;
  /** Client ID this server presents to the introspection endpoint */
  clientId: string;
  /** Client secret this server presents to the introspection endpoint */
  clientSecret: string;
  /** Resource URL that the `aud` of a token must include */
  resource: string;
  /** Receives the reason whenever the authorization server cannot be asked */
  logger: Logger;
  /** Clock in Unix milliseconds. Defaults to `Date.now`. */
  now?: () => number;
  /** `fetch` used to reach the authorization server. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

interface CachedVerification {
  /** Facts the authorization server returned about the token */
  token: VerifiedAccessToken;
  /** Unix timestamp (ms) after which the token is verified again */
  cachedUntil: number;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Applies the expiry and audience rules to an introspection response.
 *
 * A token with no `exp` is refused, because nothing would bound how long it stays usable.
 * The audience must match the resource URL exactly, as RFC 8707 binds it.
 *
 * @returns The verified facts, or `undefined` when the token must be refused
 */
function toVerifiedAccessToken(
  introspection: Record<string, unknown>,
  resource: string,
  now: number,
): VerifiedAccessToken | undefined {
  if (introspection.active !== true) return undefined;

  const { exp, aud } = introspection;
  if (typeof exp !== 'number' || exp * 1000 <= now) return undefined;

  const audiences: unknown[] = Array.isArray(aud) ? aud : [aud];
  if (!audiences.includes(resource)) return undefined;

  return {
    expiresAt: exp * 1000,
    clientId: optionalString(introspection.client_id),
    subject: optionalString(introspection.sub),
    scope: optionalString(introspection.scope),
  };
}

/**
 * Builds a verifier that checks access tokens by OAuth 2.0 Token Introspection (RFC 7662).
 *
 * The introspection endpoint comes from the authorization server metadata, and this server
 * authenticates to it with `client_secret_basic`. A valid result is cached under a SHA-256
 * of the token until the token expires, for at most {@link MAX_CACHE_TTL_MS}. Refusals are
 * never cached.
 */
export function createIntrospectionTokenVerifier({
  authorizationServerUrl,
  clientId,
  clientSecret,
  resource,
  logger,
  now = Date.now,
  fetch: fetchWithoutTimeout = fetch,
}: IntrospectionTokenVerifierOptions): AccessTokenVerifier {
  const fetchFromAuthorizationServer: typeof fetch = (input, init) =>
    fetchWithoutTimeout(input, {
      ...init,
      signal: AbortSignal.timeout(AUTHORIZATION_SERVER_TIMEOUT_MS),
    });
  const cache = new Map<string, CachedVerification>();
  const basicCredentials = Buffer.from(
    `${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`,
  ).toString('base64');
  let introspectionEndpoint: string | undefined;

  async function resolveIntrospectionEndpoint(): Promise<string> {
    if (introspectionEndpoint) return introspectionEndpoint;

    const metadata = await fetchAuthorizationServerMetadata(
      authorizationServerUrl,
      fetchFromAuthorizationServer,
    );
    if (!metadata.introspectionEndpoint) {
      throw new Error(
        `OAuth metadata for ${authorizationServerUrl} is missing introspection_endpoint`,
      );
    }
    introspectionEndpoint = metadata.introspectionEndpoint;
    return introspectionEndpoint;
  }

  async function introspect(accessToken: string): Promise<Record<string, unknown>> {
    const response = await fetchFromAuthorizationServer(await resolveIntrospectionEndpoint(), {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicCredentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ token: accessToken, token_type_hint: 'access_token' }),
    });
    if (!response.ok) {
      throw new Error(`Token introspection failed: HTTP ${response.status}`);
    }

    const introspection = (await response.json()) as Record<string, unknown> | null;
    if (typeof introspection?.active !== 'boolean') {
      throw new Error('Token introspection response is missing a boolean `active`');
    }
    return introspection;
  }

  function remember(cacheKey: string, token: VerifiedAccessToken, cachedAt: number): void {
    if (cache.size >= MAX_CACHED_TOKENS) {
      for (const [key, cached] of cache) {
        if (cached.cachedUntil <= cachedAt) cache.delete(key);
      }
    }
    if (cache.size >= MAX_CACHED_TOKENS) {
      const [oldestKey] = cache.keys();
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
    cache.set(cacheKey, {
      token,
      cachedUntil: Math.min(token.expiresAt, cachedAt + MAX_CACHE_TTL_MS),
    });
  }

  return async (accessToken) => {
    const cacheKey = createHash('sha256').update(accessToken).digest('hex');
    const cached = cache.get(cacheKey);
    if (cached && now() < cached.cachedUntil) {
      return { status: TokenVerificationStatus.Valid, token: cached.token };
    }
    cache.delete(cacheKey);

    let introspection: Record<string, unknown>;
    try {
      introspection = await introspect(accessToken);
    } catch (error) {
      // Every failure to get an answer is an outage: the caller must not treat it as a pass
      // or as a rejected token.
      logger.error('Token introspection is unavailable:', error);
      return { status: TokenVerificationStatus.Unavailable };
    }

    const verifiedAt = now();
    const token = toVerifiedAccessToken(introspection, resource, verifiedAt);
    if (!token) return { status: TokenVerificationStatus.Invalid };

    remember(cacheKey, token, verifiedAt);
    return { status: TokenVerificationStatus.Valid, token };
  };
}
