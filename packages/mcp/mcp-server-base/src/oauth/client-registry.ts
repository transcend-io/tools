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

/** Cached OAuth client identifier resolved at startup. */
let cachedClientId: string | null = null;

/** In-flight client verification shared across concurrent callers. */
let initPromise: Promise<void> | null = null;

/**
 * Resets cached OAuth client state (for tests).
 */
export function resetOAuthClientState(): void {
  cachedClientId = null;
  initPromise = null;
  resetResolvedOAuthIssuer();
  resetResolvedTranscendApiUrl();
}

/**
 * Returns the OAuth client identifier resolved at startup.
 */
export function getOAuthClientId(): string {
  if (!cachedClientId) {
    throw new Error(
      'OAuth client is not initialized. Call ensureOAuthStartupReady() before using OAuth.',
    );
  }
  return cachedClientId;
}

/**
 * Verifies OAuth client credentials against regional backends and caches the result.
 */
export async function initializeOAuthClient(
  clientId: string,
  clientSecret: string,
  logger: Logger,
): Promise<void> {
  if (cachedClientId) {
    return;
  }

  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    requireOAuthStartupEnv();
    const issuer = await resolveRegionalOAuthIssuer(
      getOAuthIssuerCandidates(),
      clientId,
      clientSecret,
      getOAuthRedirectUri(),
    );
    setResolvedOAuthIssuer(issuer);
    setResolvedTranscendApiUrl(issuer);
    cachedClientId = clientId;
    logger.info('Verified OAuth client credentials', { clientId, issuer });
  })();

  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}
