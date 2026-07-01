import type { Logger } from '../clients/graphql/base.js';
import { initializeOAuthClient } from './client-registry.js';
import { getOAuthClientIdFromEnv, getOAuthClientSecret, isOAuthModeEnabled } from './config.js';

/**
 * Validates OAuth env vars and verifies client credentials before stdio MCP startup.
 */
export async function ensureOAuthStartupReady(logger: Logger): Promise<void> {
  if (!isOAuthModeEnabled()) {
    return;
  }

  const clientId = getOAuthClientIdFromEnv();
  const clientSecret = getOAuthClientSecret();
  if (!clientId || !clientSecret) {
    return;
  }

  await initializeOAuthClient(clientId, clientSecret, logger);
}
