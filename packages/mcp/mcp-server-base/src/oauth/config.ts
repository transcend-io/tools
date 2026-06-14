import {
  DEFAULT_OAUTH_ISSUER,
  TRANSCEND_OAUTH_CLIENT_SECRET_ENV,
  TRANSCEND_OAUTH_REDIRECT_PORT_ENV,
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
 * OAuth client secret from {@link TRANSCEND_OAUTH_CLIENT_SECRET_ENV}.
 */
export function getOAuthClientSecret(): string | undefined {
  const value = process.env[TRANSCEND_OAUTH_CLIENT_SECRET_ENV]?.trim();
  return value || undefined;
}

/**
 * Fixed localhost port for the OAuth callback server (required in OAuth mode).
 */
export function getOAuthRedirectPort(): number {
  const raw = process.env[TRANSCEND_OAUTH_REDIRECT_PORT_ENV]?.trim();
  if (!raw) {
    throw new Error(`${TRANSCEND_OAUTH_REDIRECT_PORT_ENV} is required in OAuth mode`);
  }
  const port = Number.parseInt(raw, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${TRANSCEND_OAUTH_REDIRECT_PORT_ENV} must be an integer between 1 and 65535`);
  }
  return port;
}

/**
 * Validates OAuth startup environment variables when OAuth mode is enabled.
 */
export function requireOAuthStartupEnv(): void {
  if (!isOAuthModeEnabled()) {
    return;
  }

  if (!getOAuthClientSecret()) {
    throw new Error(
      `OAuth mode requires ${TRANSCEND_OAUTH_CLIENT_SECRET_ENV}. ` +
        'Set it to the client secret issued for this MCP server.',
    );
  }

  try {
    getOAuthRedirectPort();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${detail} Register redirect URI http://127.0.0.1:<port>/callback on the OAuth client ` +
        `and set ${TRANSCEND_OAUTH_REDIRECT_PORT_ENV} to that port.`,
    );
  }
}
