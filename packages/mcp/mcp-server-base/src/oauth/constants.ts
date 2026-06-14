/** Default Transcend OAuth authorization server issuer URL. */
export const DEFAULT_OAUTH_ISSUER = 'https://yo.com:4001';

/** Environment variable for the OAuth issuer URL. */
export const TRANSCEND_OAUTH_ISSUER_ENV = 'TRANSCEND_OAUTH_ISSUER';

/** Environment variable for the OAuth client secret (exchanged for client_id at startup). */
export const TRANSCEND_OAUTH_CLIENT_SECRET_ENV = 'TRANSCEND_OAUTH_CLIENT_SECRET';

/** Environment variable for the fixed localhost OAuth redirect callback port. */
export const TRANSCEND_OAUTH_REDIRECT_PORT_ENV = 'TRANSCEND_OAUTH_REDIRECT_PORT';

/** Maximum time to wait for the browser OAuth callback. */
export const OAUTH_CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

/** Default OAuth access token lifetime when the token response omits expires_in. */
export const DEFAULT_OAUTH_EXPIRES_IN_SECONDS = 3600;

/** Subtract this many seconds from expires_in before treating a token as expired. */
export const OAUTH_TOKEN_EXPIRY_SKEW_SECONDS = 60;
