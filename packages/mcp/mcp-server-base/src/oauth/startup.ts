import type { Logger } from '../clients/graphql/base.js';
import { initializeOAuthClient } from './client-registry.js';
import {
  getOAuthClientSecret,
  getOAuthIssuer,
  isOAuthModeEnabled,
  requireOAuthStartupEnv,
} from './config.js';

/**
 * Validates OAuth env vars and resolves the client identifier before stdio MCP startup.
 */
export async function ensureOAuthStartupReady(logger: Logger): Promise<void> {
  if (!isOAuthModeEnabled()) {
    return;
  }

  requireOAuthStartupEnv();
  await initializeOAuthClient(getOAuthIssuer(), getOAuthClientSecret()!, logger);
}
