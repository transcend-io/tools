import type { AuthCredentials } from '../auth.js';
import { resolveAuth } from '../server/resolve-auth.js';
import { getOAuthIssuer, isOAuthModeEnabled } from './config.js';
import { loadValidOAuthCredentialsSync } from './token-store.js';

/**
 * Resolves stdio startup credentials.
 *
 * When OAuth mode is enabled (issuer set, no API key), returns cached OAuth
 * tokens when valid; otherwise `null` so the server can connect immediately
 * and run browser login lazily on first tool use.
 */
export function resolveStdioStartupAuth(): AuthCredentials | null {
  if (isOAuthModeEnabled()) {
    return loadValidOAuthCredentialsSync(getOAuthIssuer());
  }
  return resolveAuth();
}
