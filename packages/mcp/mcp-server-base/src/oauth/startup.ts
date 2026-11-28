import type { Logger } from '../clients/graphql/base.js';
import { initializeOAuthClient } from './client-registry.js';
import {
  getOAuthClientIdFromEnv,
  getOAuthClientSecret,
  isOAuthModeEnabled,
  requireOAuthStartupEnv,
} from './config.js';
import { TRANSCEND_MCP_CREDENTIAL_STORE_ENV } from './constants.js';
import { parseCredentialStoreKind } from './credential-store/resolve-credential-store.js';

/**
 * Validates OAuth env vars and verifies client credentials before stdio MCP startup.
 */
export async function ensureOAuthStartupReady(logger: Logger): Promise<void> {
  if (!isOAuthModeEnabled()) {
    return;
  }

  requireOAuthStartupEnv();
  // Fails startup on a mistyped store, instead of on the first tool call.
  parseCredentialStoreKind(process.env[TRANSCEND_MCP_CREDENTIAL_STORE_ENV]);
  await initializeOAuthClient(getOAuthClientIdFromEnv()!, getOAuthClientSecret()!, logger);
}
