import type { AuthCredentials } from '../auth.js';
import { resolveAuth } from '../server/resolve-auth.js';
import { isOAuthModeEnabled } from './config.js';

/**
 * Resolves stdio startup credentials.
 *
 * When OAuth mode is enabled (issuer set, no API key), returns `null` so the
 * server can connect immediately and run the browser login in parallel.
 */
export function resolveStdioStartupAuth(): AuthCredentials | null {
  if (isOAuthModeEnabled()) {
    return null;
  }
  return resolveAuth();
}
