import type { AuthCredentials } from '../auth.js';
import { resolveAuth } from '../server/resolve-auth.js';
import { isOAuthModeEnabled } from './config.js';

/**
 * Resolves stdio startup credentials.
 *
 * When OAuth mode is enabled (issuer set, no API key), always returns `null` so
 * the server can connect immediately and run browser login lazily on first tool
 * use. OAuth tokens are session-only and are not loaded from disk at startup.
 */
export function resolveStdioStartupAuth(): AuthCredentials | null {
  if (isOAuthModeEnabled()) {
    return null;
  }
  return resolveAuth();
}
