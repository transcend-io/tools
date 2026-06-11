/** Default Transcend OAuth authorization server issuer URL. */
export const DEFAULT_OAUTH_ISSUER = 'https://yo.com:4001';

/** Environment variable for the OAuth issuer URL. */
export const TRANSCEND_OAUTH_ISSUER_ENV = 'TRANSCEND_OAUTH_ISSUER';

/** Environment variable for comma- or space-separated OAuth scopes. */
export const TRANSCEND_OAUTH_SCOPES_ENV = 'TRANSCEND_OAUTH_SCOPES';

/** Environment variable for a fixed OAuth callback listen port (`0` = ephemeral). */
export const TRANSCEND_OAUTH_CALLBACK_PORT_ENV = 'TRANSCEND_OAUTH_CALLBACK_PORT';

/** Default OAuth scopes requested during login (includes refresh via offline_access). */
export const DEFAULT_OAUTH_SCOPES = ['offline_access', 'viewAssessments'];

/** Maximum time to wait for the browser OAuth callback. */
export const OAUTH_CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

/** OAuth dynamic client registration request body client display name. */
export const OAUTH_CLIENT_NAME = 'Transcend MCP';

/** Environment variable override for the OAuth token store file path (tests). */
export const TRANSCEND_OAUTH_TOKEN_STORE_PATH_ENV = 'TRANSCEND_OAUTH_TOKEN_STORE_PATH';

/** Default OAuth access token lifetime when the token response omits expires_in. */
export const DEFAULT_OAUTH_EXPIRES_IN_SECONDS = 3600;

/** Subtract this many seconds from expires_in before treating a token as expired. */
export const OAUTH_TOKEN_EXPIRY_SKEW_SECONDS = 60;
