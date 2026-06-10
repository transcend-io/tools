import {
  DEFAULT_OAUTH_ISSUER,
  DEFAULT_OAUTH_SCOPES,
  TRANSCEND_OAUTH_SCOPES_ENV,
} from './constants.js';

/**
 * Returns true when stdio OAuth login should run: issuer configured and no API key override.
 */
export function isOAuthModeEnabled(): boolean {
  return Boolean(getOAuthIssuerEnv()) && !process.env.TRANSCEND_API_KEY;
}

/**
 * Resolved OAuth issuer URL from {@link TRANSCEND_OAUTH_ISSUER_ENV} or production default.
 */
export function getOAuthIssuer(): string {
  return getOAuthIssuerEnv() ?? DEFAULT_OAUTH_ISSUER;
}

function getOAuthIssuerEnv(): string | undefined {
  const value = process.env.TRANSCEND_OAUTH_ISSUER?.trim();
  return value || undefined;
}

/**
 * OAuth scopes to request during authorization. Override via {@link TRANSCEND_OAUTH_SCOPES_ENV}.
 */
export function getOAuthScopes(): string[] {
  const raw = process.env[TRANSCEND_OAUTH_SCOPES_ENV]?.trim();
  if (!raw) {
    return [...DEFAULT_OAUTH_SCOPES];
  }
  return raw.split(/[\s,]+/).filter(Boolean);
}
