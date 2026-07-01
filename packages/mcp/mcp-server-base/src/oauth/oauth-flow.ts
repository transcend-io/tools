import type { Logger } from '../clients/graphql/base.js';
import { startCallbackServer } from './callback-server.js';
import { getOAuthClientId } from './client-registry.js';
import { fetchAuthorizationServerMetadata } from './metadata.js';
import { openBrowser } from './open-browser.js';
import { generateOAuthState, generatePkcePair } from './pkce.js';
import { getOAuthScopes } from './scopes.js';
import type { OAuthAuthorizationGrant, PendingOAuthSession } from './types.js';

export interface StartOAuthLoginOptions {
  /** OAuth authorization server issuer URL */
  issuer: string;
  /** Logger for progress (must write to stderr in stdio mode) */
  logger: Logger;
}

/**
 * Builds the browser authorization URL for the authorization code + PKCE flow.
 */
export function buildAuthorizationUrl(params: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  scopes: string[];
}): string {
  const url = new URL(params.authorizationEndpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', params.state);
  url.searchParams.set('prompt', 'consent');
  if (params.scopes.length > 0) {
    // encodeURIComponent uses %20 for spaces; URLSearchParams would use '+' instead.
    url.search += `&scope=${encodeURIComponent(params.scopes.join(' '))}`;
  }
  return url.toString();
}

/**
 * Phase 1 OAuth login: fixed redirect callback, browser consent.
 *
 * Returns a session handle; token exchange (phase 3) consumes {@link PendingOAuthSession.waitForCallback}.
 */
export async function startOAuthLogin(
  options: StartOAuthLoginOptions,
): Promise<PendingOAuthSession> {
  const { issuer, logger } = options;
  const state = generateOAuthState();
  const { codeVerifier, codeChallenge } = generatePkcePair();
  const scopes = getOAuthScopes();
  const clientId = getOAuthClientId();

  const callbackHandle = await startCallbackServer({ expectedState: state });

  logger.info('OAuth callback server listening', {
    port: callbackHandle.port,
    redirectUri: callbackHandle.redirectUri,
  });

  try {
    const metadata = await fetchAuthorizationServerMetadata(issuer);
    logger.info('Fetched OAuth authorization server metadata', {
      issuer: metadata.issuer,
      authorizationEndpoint: metadata.authorizationEndpoint,
    });

    const authorizationUrl = buildAuthorizationUrl({
      authorizationEndpoint: metadata.authorizationEndpoint,
      clientId,
      redirectUri: callbackHandle.redirectUri,
      codeChallenge,
      state,
      scopes,
    });

    logger.info('Opening browser for OAuth consent', { authorizationUrl });
    await openBrowser(authorizationUrl, logger);

    return {
      authorizationUrl,
      redirectUri: callbackHandle.redirectUri,
      clientId,
      codeVerifier,
      waitForCallback: callbackHandle.waitForCallback,
      close: callbackHandle.close,
    };
  } catch (error) {
    await callbackHandle.close().catch(() => undefined);
    throw error;
  }
}

/**
 * Waits for the browser callback and returns the full authorization grant for token exchange.
 */
export async function waitForAuthorizationGrant(
  session: PendingOAuthSession,
): Promise<OAuthAuthorizationGrant> {
  const callback = await session.waitForCallback();
  return {
    code: callback.code,
    state: callback.state,
    codeVerifier: session.codeVerifier,
    redirectUri: session.redirectUri,
    clientId: session.clientId,
  };
}
