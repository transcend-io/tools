import { DEFAULT_OAUTH_ISSUER, OAUTH_REGIONAL_ISSUERS } from '../defaults.js';
import {
  DEFAULT_OAUTH_REDIRECT_HOST,
  TRANSCEND_OAUTH_CLIENT_ID_ENV,
  TRANSCEND_OAUTH_CLIENT_SECRET_ENV,
  TRANSCEND_OAUTH_ISSUER_ENV,
  TRANSCEND_OAUTH_REDIRECT_HOST_ENV,
  TRANSCEND_OAUTH_REDIRECT_PORT_ENV,
  formatOAuthClientConfigError,
  getOAuthClientsAdminUrl,
} from './constants.js';
import { isTestEnv, resolveTestOverride } from './env.js';

/** Validated OAuth startup configuration. */
interface OAuthStartupConfig {
  /** OAuth client identifier */
  clientId: string;
  /** OAuth client secret */
  clientSecret: string;
  /** Loopback host for the OAuth callback server */
  redirectHost: string;
  /** Fixed localhost port for the OAuth callback server */
  redirectPort: number;
}

/** Regional OAuth issuer resolved at startup via client-verify. */
let resolvedOAuthIssuer: string | null = null;

/** Transcend GraphQL backend URL resolved at startup via client-verify. */
let resolvedTranscendApiUrl: string | null = null;

/**
 * Returns true when {@link TRANSCEND_API_KEY} is set in the process environment.
 */
export function hasTranscendApiKeyEnv(): boolean {
  return Boolean(process.env.TRANSCEND_API_KEY);
}

/**
 * Returns true when stdio OAuth login should run: client ID configured and no API key override.
 */
export function isOAuthModeEnabled(): boolean {
  return Boolean(getOAuthClientIdFromEnv()) && !hasTranscendApiKeyEnv();
}

/**
 * Returns OAuth issuer URLs to probe during startup client verification.
 */
export function getOAuthIssuerCandidates(): readonly string[] {
  if (isTestEnv()) {
    const testOverride = process.env[TRANSCEND_OAUTH_ISSUER_ENV]?.trim();
    if (testOverride) {
      return [testOverride];
    }
  }
  return OAUTH_REGIONAL_ISSUERS;
}

/**
 * Returns the OAuth issuer URL resolved at startup, or the production default
 * when OAuth mode is disabled.
 */
export function getOAuthIssuer(): string {
  if (resolvedOAuthIssuer) {
    return resolvedOAuthIssuer;
  }
  if (isOAuthModeEnabled()) {
    throw new Error(
      'OAuth issuer is not resolved. Call ensureOAuthStartupReady() before using OAuth.',
    );
  }
  return resolveTestOverride(TRANSCEND_OAUTH_ISSUER_ENV, DEFAULT_OAUTH_ISSUER);
}

/**
 * Returns the Transcend GraphQL backend URL set during OAuth client verification.
 */
export function getResolvedTranscendApiUrl(): string {
  if (!resolvedTranscendApiUrl) {
    throw new Error(
      'Transcend API URL is not resolved. Call ensureOAuthStartupReady() before using OAuth.',
    );
  }
  return resolvedTranscendApiUrl;
}

/**
 * Caches the regional OAuth issuer after successful startup client verification.
 */
export function setResolvedOAuthIssuer(issuer: string): void {
  resolvedOAuthIssuer = issuer;
}

/**
 * Caches the Transcend GraphQL backend URL after successful startup client verification.
 */
export function setResolvedTranscendApiUrl(apiUrl: string): void {
  resolvedTranscendApiUrl = apiUrl;
}

/**
 * Clears the cached regional OAuth issuer (for tests).
 */
export function resetResolvedOAuthIssuer(): void {
  resolvedOAuthIssuer = null;
}

/**
 * Clears the cached Transcend GraphQL backend URL (for tests).
 */
export function resetResolvedTranscendApiUrl(): void {
  resolvedTranscendApiUrl = null;
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

const LOOPBACK_IPV6 = '::1';
const LOOPBACK_IPV4_FIRST_OCTET = 127;
const IPV4_OCTET_COUNT = 4;
const MAX_IPV4_OCTET = 255;

/** Returns true when `octet` is a decimal string from 0 through 255. */
function isDecimalIpv4Octet(octet: string): boolean {
  if (octet.length === 0 || octet.length > 3) {
    return false;
  }

  for (const char of octet) {
    if (char < '0' || char > '9') {
      return false;
    }
  }

  return Number.parseInt(octet, 10) <= MAX_IPV4_OCTET;
}

/** Returns true for RFC 6890 loopback hosts (`127.0.0.0/8` or `::1`). */
function isLoopbackRedirectHost(host: string): boolean {
  if (host === LOOPBACK_IPV6) {
    return true;
  }

  const octets = host.split('.');
  if (octets.length !== IPV4_OCTET_COUNT) {
    return false;
  }
  if (octets[0] !== String(LOOPBACK_IPV4_FIRST_OCTET)) {
    return false;
  }

  return octets.every(isDecimalIpv4Octet);
}

function parseRedirectHost(raw: string | undefined): string {
  if (!raw) {
    return DEFAULT_OAUTH_REDIRECT_HOST;
  }

  const host = raw.startsWith('[') && raw.endsWith(']') ? raw.slice(1, -1) : raw;
  if (!isLoopbackRedirectHost(host)) {
    throw new Error(
      `${TRANSCEND_OAUTH_REDIRECT_HOST_ENV} must be a loopback address (127.x.x.x or ::1)`,
    );
  }
  return host;
}

function parseRedirectPort(raw: string | undefined): number {
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
 * Validates all OAuth startup environment variables in one pass.
 */
function validateOAuthStartupConfig(): OAuthStartupConfig {
  const clientId = process.env[TRANSCEND_OAUTH_CLIENT_ID_ENV]?.trim();
  if (!clientId) {
    throw new Error(
      formatOAuthClientConfigError(
        `OAuth mode requires ${TRANSCEND_OAUTH_CLIENT_ID_ENV}. ` +
          `Set it to the client identifier issued at ${getOAuthClientsAdminUrl()}.`,
      ),
    );
  }

  const clientSecret = process.env[TRANSCEND_OAUTH_CLIENT_SECRET_ENV]?.trim();
  if (!clientSecret) {
    throw new Error(
      formatOAuthClientConfigError(
        `OAuth mode requires ${TRANSCEND_OAUTH_CLIENT_SECRET_ENV}. ` +
          `Set it to the client secret issued at ${getOAuthClientsAdminUrl()}.`,
      ),
    );
  }

  let redirectHost: string;
  let redirectPort: number;
  try {
    redirectHost = parseRedirectHost(process.env[TRANSCEND_OAUTH_REDIRECT_HOST_ENV]?.trim());
    redirectPort = parseRedirectPort(process.env[TRANSCEND_OAUTH_REDIRECT_PORT_ENV]?.trim());
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

  return { clientId, clientSecret, redirectHost, redirectPort };
}

/**
 * Loopback host for the OAuth callback server (`127.x.x.x` or `::1`).
 */
export function getOAuthRedirectHost(): string {
  return parseRedirectHost(process.env[TRANSCEND_OAUTH_REDIRECT_HOST_ENV]?.trim());
}

/**
 * Fixed localhost port for the OAuth callback server (required in OAuth mode).
 */
export function getOAuthRedirectPort(): number {
  return parseRedirectPort(process.env[TRANSCEND_OAUTH_REDIRECT_PORT_ENV]?.trim());
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
export function requireOAuthStartupEnv(): OAuthStartupConfig | undefined {
  if (!isOAuthModeEnabled()) {
    return undefined;
  }
  return validateOAuthStartupConfig();
}
