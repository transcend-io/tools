import { DEFAULT_OAUTH_ISSUER } from '../defaults.js';
import {
  DEFAULT_OAUTH_REDIRECT_HOST,
  TRANSCEND_OAUTH_CLIENT_ID_ENV,
  TRANSCEND_OAUTH_CLIENT_SECRET_ENV,
  TRANSCEND_OAUTH_REDIRECT_HOST_ENV,
  TRANSCEND_OAUTH_REDIRECT_PORT_ENV,
  formatOAuthClientConfigError,
  getOAuthClientsAdminUrl,
} from './constants.js';

const ALLOWED_OAUTH_REDIRECT_HOSTS = new Set(['127.0.0.1', '::1']);

/**
 * Returns true when {@link TRANSCEND_API_KEY} is set in the process environment.
 */
export function hasTranscendApiKeyEnv(): boolean {
  return Boolean(process.env.TRANSCEND_API_KEY);
}

/**
 * Returns true when stdio OAuth login should run: issuer configured and no API key override.
 */
export function isOAuthModeEnabled(): boolean {
  return Boolean(getOAuthIssuerEnv()) && !hasTranscendApiKeyEnv();
}

/**
 * Resolved OAuth issuer URL from {@link TRANSCEND_OAUTH_ISSUER_ENV} or production default.
 */
export function getOAuthIssuer(): string {
  return getOAuthIssuerEnv() ?? DEFAULT_OAUTH_ISSUER;
}

/**
 * Fetches the oauth issuer from the environment variable.
 */
function getOAuthIssuerEnv(): string | undefined {
  const value = process.env.TRANSCEND_OAUTH_ISSUER?.trim();
  return value || undefined;
}

/**
 * OAuth client identifier from {@link TRANSCEND_OAUTH_CLIENT_ID_ENV}.
 */
export function getOAuthClientIdFromEnv(): string | undefined {
  const value = process.env[TRANSCEND_OAUTH_CLIENT_ID_ENV]?.trim();
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
 * Loopback host for the OAuth callback server (`127.0.0.1` or `::1`).
 */
export function getOAuthRedirectHost(): string {
  const raw = process.env[TRANSCEND_OAUTH_REDIRECT_HOST_ENV]?.trim();
  if (!raw) {
    return DEFAULT_OAUTH_REDIRECT_HOST;
  }

  const host = raw.startsWith('[') && raw.endsWith(']') ? raw.slice(1, -1) : raw;
  if (!ALLOWED_OAUTH_REDIRECT_HOSTS.has(host)) {
    throw new Error(
      `${TRANSCEND_OAUTH_REDIRECT_HOST_ENV} must be a loopback address (${[...ALLOWED_OAUTH_REDIRECT_HOSTS].join(' or ')})`,
    );
  }
  return host;
}

/**
 * Formats the OAuth redirect URI host to include brackets for IPv6 addresses.
 */
function formatOAuthRedirectUriHost(host: string): string {
  return host.includes(':') ? `[${host}]` : host;
}

/**
 * Fixed localhost redirect URI for the OAuth callback server (required in OAuth mode).
 */
export function getOAuthRedirectUri(): string {
  const host = formatOAuthRedirectUriHost(getOAuthRedirectHost());
  return `http://${host}:${getOAuthRedirectPort()}/callback`;
}

/**
 * Validates OAuth startup environment variables when OAuth mode is enabled.
 */
export function requireOAuthStartupEnv(): void {
  if (!isOAuthModeEnabled()) {
    return;
  }

  if (!getOAuthClientIdFromEnv()) {
    throw new Error(
      formatOAuthClientConfigError(
        `OAuth mode requires ${TRANSCEND_OAUTH_CLIENT_ID_ENV}. ` +
          `Set it to the client identifier issued at ${getOAuthClientsAdminUrl()}.`,
      ),
    );
  }

  if (!getOAuthClientSecret()) {
    throw new Error(
      formatOAuthClientConfigError(
        `OAuth mode requires ${TRANSCEND_OAUTH_CLIENT_SECRET_ENV}. ` +
          `Set it to the client secret issued at ${getOAuthClientsAdminUrl()}.`,
      ),
    );
  }

  try {
    getOAuthRedirectHost();
    getOAuthRedirectPort();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      formatOAuthClientConfigError(
        `${detail} Register redirect URI http://<host>:<port>/callback on the OAuth client ` +
          `(host from ${TRANSCEND_OAUTH_REDIRECT_HOST_ENV}, default ${DEFAULT_OAUTH_REDIRECT_HOST}; ` +
          `port from ${TRANSCEND_OAUTH_REDIRECT_PORT_ENV}).`,
      ),
    );
  }
}
