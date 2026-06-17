import type { Logger } from '../clients/graphql/base.js';
import { initializeOAuthClient } from './client-registry.js';
import {
  getOAuthClientIdFromEnv,
  getOAuthClientSecret,
  getOAuthIssuer,
  hasTranscendApiKeyEnv,
  isOAuthModeEnabled,
  requireOAuthStartupEnv,
} from './config.js';

/**
 * Validates OAuth env vars and verifies client credentials before stdio MCP startup.
 */
export async function ensureOAuthStartupReady(logger: Logger): Promise<void> {
  logger.info('MCP startup auth env', {
    hasTranscendApiKey: hasTranscendApiKeyEnv(),
    oauthModeEnabled: isOAuthModeEnabled(),
  });

  if (!isOAuthModeEnabled()) {
    return;
  }

  requireOAuthStartupEnv();
  await initializeOAuthClient(
    getOAuthIssuer(),
    getOAuthClientIdFromEnv()!,
    getOAuthClientSecret()!,
    logger,
  );
}
