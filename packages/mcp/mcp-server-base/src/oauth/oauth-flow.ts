import type { Logger } from '../clients/graphql/base.js';
import { startCallbackServer } from './callback-server.js';
import { getOAuthScopes } from './config.js';
import { registerOAuthClient } from './dcr.js';
import { fetchAuthorizationServerMetadata } from './metadata.js';
import { openBrowser } from './open-browser.js';
import { generateOAuthState, generatePkcePair } from './pkce.js';
import type { PendingOAuthSession } from './types.js';

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
  if (params.scopes.length > 0) {
    url.searchParams.set('scope', params.scopes.join(' '));
  }
  return url.toString();
}

/**
 * Phase 1 OAuth login: ephemeral callback, DCR, browser consent.
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

    const registration = await registerOAuthClient(
      metadata.registrationEndpoint,
      callbackHandle.redirectUri,
    );
    logger.info('Registered OAuth client via dynamic client registration', {
      clientId: registration.clientId,
      redirectUri: registration.redirectUri,
    });

    const authorizationUrl = buildAuthorizationUrl({
      authorizationEndpoint: metadata.authorizationEndpoint,
      clientId: registration.clientId,
      redirectUri: registration.redirectUri,
      codeChallenge,
      state,
      scopes,
    });

    logger.info('Opening browser for OAuth consent', { authorizationUrl });
    await openBrowser(authorizationUrl);

    return {
      redirectUri: registration.redirectUri,
      clientId: registration.clientId,
      codeVerifier,
      waitForCallback: callbackHandle.waitForCallback,
      close: callbackHandle.close,
    };
  } catch (error) {
    await callbackHandle.close().catch(() => undefined);
    throw error;
  }
}
