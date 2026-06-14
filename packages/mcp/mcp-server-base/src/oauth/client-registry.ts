import type { Logger } from '../clients/graphql/base.js';
import { fetchOAuthClientInfo } from './client-info.js';

/** Cached OAuth client identifier resolved at startup. */
let cachedClientId: string | null = null;

/** In-flight client-info exchange shared across concurrent callers. */
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
 * Exchanges the client secret for a client identifier and caches it for the process lifetime.
 */
export async function initializeOAuthClient(
  issuer: string,
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
    const clientId = await fetchOAuthClientInfo(issuer, clientSecret);
    cachedClientId = clientId;
    logger.info('Resolved OAuth client from client secret', { clientId });
  })();

  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}
