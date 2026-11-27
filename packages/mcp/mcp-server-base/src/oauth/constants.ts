import { resolveMcpDashboardUrl } from '../server/resolve-dashboard-url.js';

/** OAuth 2.0 token endpoint grant_type values used by this package. */
export enum OAuthGrantType {
  AuthorizationCode = 'authorization_code',
  RefreshToken = 'refresh_token',
}

/** OAuth 2.0 `token_type_hint` values for token revocation (RFC 7009). */
export enum OAuthTokenTypeHint {
  RefreshToken = 'refresh_token',
  AccessToken = 'access_token',
}

/** Environment variable for the OAuth issuer URL (test-only; requires ALLOW_TEST_OVERRIDES=1). */
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

/** Path on the local loopback server that receives the OAuth redirect. */
export const OAUTH_CALLBACK_PATH = '/callback';

/** Maximum time to wait for `/oauth/client-verify` during startup credential checks. */
export const OAUTH_CLIENT_VERIFY_TIMEOUT_MS = 5_000;

/** Maximum time to wait for the browser OAuth callback. */
export const OAUTH_CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

/** Maximum time the sign-in prompt stays open in the host. */
export const OAUTH_SIGN_IN_PROMPT_TIMEOUT_MS = 10 * 60 * 1000;

/** Time after a declined sign-in prompt during which the host shows no new prompt. */
export const OAUTH_SIGN_IN_DECLINE_COOLDOWN_MS = 60_000;

/** Instruction appended to agent-facing OAuth callback failures that require user action. */
const OAUTH_CALLBACK_AGENT_NO_RETRY_INSTRUCTION =
  'Report this to the user and wait for them to send a new message before calling tools again. Do not retry automatically.';

/** Agent-facing message when the OAuth browser callback times out. */
export const OAUTH_CALLBACK_TIMEOUT_AGENT_MESSAGE = `OAuth sign-in timed out. ${OAUTH_CALLBACK_AGENT_NO_RETRY_INSTRUCTION}`;

/** Agent-facing message when the user denies OAuth consent in the browser. */
export const OAUTH_CALLBACK_DENIED_AGENT_MESSAGE = `OAuth sign-in was denied. ${OAUTH_CALLBACK_AGENT_NO_RETRY_INSTRUCTION}`;

/** Agent-facing message when the user declines the sign-in prompt. */
export const OAUTH_SIGN_IN_DECLINED_AGENT_MESSAGE = `The user declined sign-in. ${OAUTH_CALLBACK_AGENT_NO_RETRY_INSTRUCTION}`;

/** Agent-facing message when another MCP process on this machine holds the callback port. */
export const OAUTH_SIGN_IN_ELSEWHERE_AGENT_MESSAGE =
  'Sign-in is in progress in another window. Finish it, then retry.';

/** Agent-facing message when the caller gives up before the user signs in. */
export const OAUTH_SIGN_IN_ABANDONED_AGENT_MESSAGE =
  'The request was cancelled before sign-in finished.';

/** Browser callback page message shown after successful OAuth authentication. */
export const OAUTH_CALLBACK_SUCCESS_MESSAGE =
  'The Transcend MCP has been successfully authenticated. You can close this window and return to your host application.';

/** Browser callback page message shown when OAuth authentication fails. */
export const OAUTH_CALLBACK_ERROR_MESSAGE =
  'The Transcend MCP authentication failed. Return to your host application and try again.';

/** Environment variable that selects where the OAuth login is saved. */
export const TRANSCEND_MCP_CREDENTIAL_STORE_ENV = 'TRANSCEND_MCP_CREDENTIAL_STORE';

/** Environment variable that overrides the directory for the credentials file and refresh locks. */
export const TRANSCEND_MCP_CONFIG_DIR_ENV = 'TRANSCEND_MCP_CONFIG_DIR';

/**
 * Maximum time to wait for the token or revocation endpoint. A refresh holds
 * the refresh lock, so a request that never answers must not hold it forever.
 */
export const OAUTH_TOKEN_REQUEST_TIMEOUT_MS = 15_000;

/** Default OAuth access token lifetime when the token response omits expires_in. */
export const DEFAULT_OAUTH_EXPIRES_IN_SECONDS = 3600;

/** Subtract this many seconds from expires_in before treating a token as expired. */
export const OAUTH_TOKEN_EXPIRY_SKEW_SECONDS = 60;

/** Environment variable for the Transcend admin dashboard base URL (test-only; requires ALLOW_TEST_OVERRIDES=1). */
export const TRANSCEND_DASHBOARD_URL_ENV = 'TRANSCEND_DASHBOARD_URL';

/** Path on the admin dashboard where OAuth clients are managed. */
export const OAUTH_CLIENTS_ADMIN_PATH = '/admin/oauth-clients';

/**
 * Returns the admin OAuth clients URL using {@link resolveMcpDashboardUrl}.
 */
export function getOAuthClientsAdminUrl(): string {
  return `${resolveMcpDashboardUrl().replace(/\/+$/, '')}${OAUTH_CLIENTS_ADMIN_PATH}`;
}

/**
 * Appends admin guidance to an OAuth client configuration error message.
 */
export function formatOAuthClientConfigError(detail: string): string {
  return (
    `${detail}. Have an admin navigate to ${getOAuthClientsAdminUrl()} ` +
    'to fetch or create valid credentials.'
  );
}

/**
 * Returns the text of the sign-in prompt the host shows before a browser opens.
 */
export function formatOAuthSignInPrompt(
  /** Host of the authorization URL the browser opens, so the prompt names where it goes */
  authorizationHost: string,
  /** Tool waiting on the sign-in, when the call came through a tool */
  toolName?: string,
): string {
  const purpose = toolName ? ` to run ${toolName}` : '';
  return `Sign in to Transcend (${authorizationHost})${purpose}. Accept opens your browser.`;
}

/**
 * Returns the agent-facing message that hands the user a sign-in link, for
 * when no sign-in prompt can be shown.
 */
export function formatOAuthSignInLinkMessage(authorizationUrl: string): string {
  // A bare parenthesis would end the markdown link early.
  const linkTarget = authorizationUrl.replaceAll('(', '%28').replaceAll(')', '%29');
  const minutes = OAUTH_CALLBACK_TIMEOUT_MS / 60_000;
  return (
    'This tool needs a Transcend sign-in. Show the user this link: ' +
    `[Sign in to Transcend](${linkTarget}). ` +
    `It goes to ${new URL(authorizationUrl).host}. ` +
    'Wait until the user says they signed in, then retry once. Do not retry before that. ' +
    `The link expires within ${minutes} minutes.`
  );
}
