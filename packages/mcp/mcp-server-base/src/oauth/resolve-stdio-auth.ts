import type { AuthCredentials } from '../auth.js';
import { resolveAuth, tryResolveAuth } from '../server/resolve-auth.js';
import { isOAuthModeEnabled, requireOAuthStartupEnv } from './config.js';

/**
 * Resolves stdio startup credentials.
 *
 * When OAuth mode is enabled (client ID set, no API key), always returns `null` so
 * the server can connect immediately. The first tool call that needs auth loads
 * the saved login from the credential store, and runs browser login only when
 * there is none.
 */
export function resolveStdioStartupAuth(): AuthCredentials | null {
  if (isOAuthModeEnabled()) {
    requireOAuthStartupEnv();
    return null;
  }
  return resolveAuth();
}

/**
 * Like {@link resolveStdioStartupAuth} but allows null credentials in API-key mode
 * when the server includes public tools. Protected tools lazy-auth or fail at
 * call time instead of blocking startup.
 */
export function resolveStdioStartupAuthOptional(): AuthCredentials | null {
  if (isOAuthModeEnabled()) {
    requireOAuthStartupEnv();
    return null;
  }
  return tryResolveAuth();
}
