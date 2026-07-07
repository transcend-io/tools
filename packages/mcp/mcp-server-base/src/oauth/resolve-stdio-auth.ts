import type { AuthCredentials } from '../auth.js';
import { resolveAuth, tryResolveAuth } from '../server/resolve-auth.js';
import { isOAuthModeEnabled, requireOAuthStartupEnv } from './config.js';

/**
 * Resolves stdio startup credentials.
 *
 * When OAuth mode is enabled (issuer set, no API key), always returns `null` so
 * the server can connect immediately and run browser login lazily on first tool
 * use. OAuth tokens are session-only and are not loaded from disk at startup.
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
