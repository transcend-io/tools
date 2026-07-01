import type { Logger } from '../clients/graphql/base.js';
import { resolveRegionalOAuthIssuer } from './client-verify.js';
import {
  getOAuthIssuerCandidates,
  getOAuthRedirectUri,
  requireOAuthStartupEnv,
  resetResolvedOAuthIssuer,
  resetResolvedTranscendApiUrl,
  setResolvedOAuthIssuer,
  setResolvedTranscendApiUrl,
} from './config.js';

/** Module-scoped OAuth client initialization state. */
interface OAuthClientState {
  /** Cached OAuth client identifier resolved at startup. */
  clientId: string | null;
  /** In-flight client verification shared across concurrent callers. */
  initPromise: Promise<void> | null;
}

const oauthClientState: OAuthClientState = {
  clientId: null,
  initPromise: null,
};

/**
 * Resets cached OAuth client state (for tests).
 */
export function resetOAuthClientState(): void {
  oauthClientState.clientId = null;
  oauthClientState.initPromise = null;
  resetResolvedOAuthIssuer();
  resetResolvedTranscendApiUrl();
}

/**
 * Returns the OAuth client identifier resolved at startup.
 */
export function getOAuthClientId(): string {
  if (!oauthClientState.clientId) {
    throw new Error(
      'OAuth client is not initialized. Call ensureOAuthStartupReady() before using OAuth.',
    );
  }
  return oauthClientState.clientId;
}

/**
 * Verifies OAuth client credentials against regional backends and caches the result.
 */
export async function initializeOAuthClient(
  clientId: string,
  clientSecret: string,
  logger: Logger,
): Promise<void> {
  if (oauthClientState.clientId) {
    return;
  }

  if (oauthClientState.initPromise) {
    await oauthClientState.initPromise;
    return;
  }

  oauthClientState.initPromise = (async () => {
    requireOAuthStartupEnv();
    const issuer = await resolveRegionalOAuthIssuer(
      getOAuthIssuerCandidates(),
      clientId,
      clientSecret,
      getOAuthRedirectUri(),
    );
    setResolvedOAuthIssuer(issuer);
    setResolvedTranscendApiUrl(issuer);
    oauthClientState.clientId = clientId;
    logger.info('Verified OAuth client credentials', { clientId, issuer });
  })();

  try {
    await oauthClientState.initPromise;
  } finally {
    oauthClientState.initPromise = null;
  }
}
