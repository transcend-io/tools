import { DEFAULT_DASHBOARD_URL } from '../defaults.js';

/** Default Transcend OAuth authorization server issuer URL. */
export const DEFAULT_OAUTH_ISSUER = 'https://yo.com:4001';

/** Environment variable for the OAuth issuer URL. */
export const TRANSCEND_OAUTH_ISSUER_ENV = 'TRANSCEND_OAUTH_ISSUER';

/** Environment variable for the OAuth client identifier. */
export const TRANSCEND_OAUTH_CLIENT_ID_ENV = 'TRANSCEND_OAUTH_CLIENT_ID';

/** Environment variable for the OAuth client secret. */
export const TRANSCEND_OAUTH_CLIENT_SECRET_ENV = 'TRANSCEND_OAUTH_CLIENT_SECRET';

/** Environment variable for the fixed localhost OAuth redirect callback port. */
export const TRANSCEND_OAUTH_REDIRECT_PORT_ENV = 'TRANSCEND_OAUTH_REDIRECT_PORT';

/** Environment variable for the loopback host used in the OAuth redirect URI. */
export const TRANSCEND_OAUTH_REDIRECT_HOST_ENV = 'TRANSCEND_OAUTH_REDIRECT_HOST';

/** Default loopback host for the OAuth redirect URI (`127.0.0.1`). */
export const DEFAULT_OAUTH_REDIRECT_HOST = '127.0.0.1';

/** Maximum time to wait for the browser OAuth callback. */
export const OAUTH_CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

/** Agent-facing message when the OAuth browser callback times out. */
export const OAUTH_CALLBACK_TIMEOUT_AGENT_MESSAGE =
  'OAuth sign-in timed out. Report this to the user and wait for them to send a new message before calling tools again. Do not retry automatically.';

/** Default OAuth access token lifetime when the token response omits expires_in. */
export const DEFAULT_OAUTH_EXPIRES_IN_SECONDS = 3600;

/** Subtract this many seconds from expires_in before treating a token as expired. */
export const OAUTH_TOKEN_EXPIRY_SKEW_SECONDS = 60;

/** Environment variable for the Transcend admin dashboard base URL. */
export const TRANSCEND_DASHBOARD_URL_ENV = 'TRANSCEND_DASHBOARD_URL';

/** Path on the admin dashboard where OAuth clients are managed. */
export const OAUTH_CLIENTS_ADMIN_PATH = '/admin/oauth-clients';

/** Default URL where admins create and manage OAuth clients. */
export const OAUTH_CLIENTS_ADMIN_URL = `${DEFAULT_DASHBOARD_URL}${OAUTH_CLIENTS_ADMIN_PATH}`;

/**
 * Resolves the admin OAuth clients URL from {@link TRANSCEND_DASHBOARD_URL_ENV}
 * or {@link OAUTH_CLIENTS_ADMIN_URL}.
 */
export function buildOAuthClientsAdminUrl(): string {
  const dashboardUrl = process.env[TRANSCEND_DASHBOARD_URL_ENV]?.trim();
  if (!dashboardUrl) {
    return OAUTH_CLIENTS_ADMIN_URL;
  }
  return `${dashboardUrl.replace(/\/+$/, '')}${OAUTH_CLIENTS_ADMIN_PATH}`;
}

/**
 * Appends admin guidance to an OAuth client configuration error message.
 */
export function formatOAuthClientConfigError(detail: string): string {
  return (
    `${detail}. Have an admin navigate to ${buildOAuthClientsAdminUrl()} ` +
    'to fetch or create valid credentials.'
  );
}
