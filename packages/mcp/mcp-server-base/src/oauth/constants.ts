/** Default Transcend OAuth authorization server issuer URL. */
export const DEFAULT_OAUTH_ISSUER = 'https://yo.com:4001';

/** Environment variable for the OAuth issuer URL. */
export const TRANSCEND_OAUTH_ISSUER_ENV = 'TRANSCEND_OAUTH_ISSUER';

/** Environment variable for comma- or space-separated OAuth scopes. */
export const TRANSCEND_OAUTH_SCOPES_ENV = 'TRANSCEND_OAUTH_SCOPES';

/** Default OAuth scopes requested during login (includes refresh via offline_access). */
export const DEFAULT_OAUTH_SCOPES = ['offline_access'];

/** Maximum time to wait for the browser OAuth callback. */
export const OAUTH_CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

/** OAuth dynamic client registration request body client display name. */
export const OAUTH_CLIENT_NAME = 'Transcend MCP';
