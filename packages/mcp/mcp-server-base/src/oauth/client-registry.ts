import type { Logger } from '../clients/graphql/base.js';
import { verifyOAuthClientCredentials } from './client-verify.js';
import { getOAuthRedirectUri } from './config.js';

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
 * Verifies OAuth client credentials and caches the client identifier for the process lifetime.
 */
export async function initializeOAuthClient(
  issuer: string,
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
    await verifyOAuthClientCredentials(issuer, clientId, clientSecret, getOAuthRedirectUri());
    cachedClientId = clientId;
    logger.info('Verified OAuth client credentials', { clientId });
  })();

  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}
