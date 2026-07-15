export { authHeaders } from './auth.js';
export type { AuthCredentials, ApiKeyAuth, OAuthTokenAuth, SessionCookieAuth } from './auth.js';

export { requestAuthContext, getRequestAuth } from './auth-context.js';

export {
  MCP_CALLER_HEADER,
  extractMcpCallerFromHeaders,
  getRequestMcpCaller,
  requestMcpCallerContext,
} from './mcp-caller-context.js';

export { toolCallContext, getToolCallIdHeader, TOOLCALL_ID_HEADER } from './tool-call-context.js';
export type { ToolCallContext } from './tool-call-context.js';

export { elicitContext, getElicitContext } from './elicit-context.js';
export type { ElicitContext } from './elicit-context.js';

export { TranscendGraphQLBase, SimpleLogger } from './clients/graphql/base.js';
export type { Logger, ListOptions } from './clients/graphql/base.js';
export { TranscendRestClient } from './clients/rest-client.js';

export {
  DEFAULT_DASHBOARD_URL,
  DEFAULT_SOMBRA_URL,
  DEFAULT_TRANSCEND_API_URL,
} from './defaults.js';

export { ToolError, ErrorCode, classifyHttpError } from './errors.js';

export { validateArgs, z } from './validation/index.js';
export type { ValidationResult } from './validation/index.js';
export {
  CursorPaginationSchema,
  EmptySchema,
  OffsetPaginationSchema,
  PaginationSchema,
} from './validation/schemas.js';
export { collectMissingDescriptions, MIN_DESCRIPTION_LENGTH } from './validation/describe-audit.js';

export type { ToolAnnotations, ToolDefinition, ToolClients } from './tools/types.js';
export { defineTool } from './tools/types.js';

export { createToolResult, createErrorResult, createListResult, groupBy } from './tools/helpers.js';

export { createMCPServer } from './server/create-server.js';
export type { MCPServerOptions } from './server/create-server.js';

export { buildMcpServer } from './server/build-server.js';
export type { BuildMcpServerOptions } from './server/build-server.js';

export { resolveAuth, tryResolveAuth, extractApiKeyFromHeaders } from './server/resolve-auth.js';

export {
  isOAuthModeEnabled,
  getOAuthIssuer,
  getOAuthClientIdFromEnv,
  getOAuthClientSecret,
  getOAuthRedirectPort,
  requireOAuthStartupEnv,
} from './oauth/config.js';
export {
  OFFLINE_ACCESS_SCOPE,
  mergeOAuthScopes,
  configureOAuthScopes,
  getOAuthScopes,
  resetConfiguredOAuthScopes,
} from './oauth/scopes.js';
export {
  resolveStdioStartupAuth,
  resolveStdioStartupAuthOptional,
} from './oauth/resolve-stdio-auth.js';
export {
  startOAuthLogin,
  buildAuthorizationUrl,
  waitForAuthorizationGrant,
} from './oauth/oauth-flow.js';
export {
  ensureLazyOAuthAuth,
  getLazyOAuthCredentials,
  getStoredAuthorizationGrant,
  isLazyOAuthSessionReady,
  resetLazyOAuthState,
} from './oauth/lazy-auth.js';
export { verifyOAuthClientCredentials } from './oauth/client-verify.js';
export {
  getOAuthClientId,
  initializeOAuthClient,
  resetOAuthClientState,
} from './oauth/client-registry.js';
export { ensureOAuthStartupReady } from './oauth/startup.js';
export { OAuthCallbackError, parseOAuthCallbackQuery } from './oauth/parse-callback.js';
export { exchangeAuthorizationCode } from './oauth/token-exchange.js';
export { refreshOAuthTokens } from './oauth/token-refresh.js';
export {
  getActiveOAuthCredentials,
  getActiveStoredOAuthTokens,
  getValidOAuthCredentials,
  resetOAuthTokenManagerState,
  setActiveStoredOAuthTokens,
} from './oauth/token-manager.js';
export {
  computeOAuthExpiresAt,
  isOAuthTokenAuthValid,
  isStoredOAuthTokenValid,
  storedOAuthTokensToAuth,
  storedTokensFromRefreshResponse,
  storedTokensFromTokenResponse,
} from './oauth/token-store.js';
export type {
  OAuthAuthorizationGrant,
  OAuthCallbackResult,
  OAuthTokenResponse,
  PendingOAuthSession,
  StoredOAuthTokens,
} from './oauth/types.js';

export { resolveMcpDashboardUrl } from './server/resolve-dashboard-url.js';

export { resolveMcpGraphqlUrl } from './server/resolve-graphql-url.js';

export { parseTransportArgs } from './server/parse-args.js';
export type { TransportConfig } from './server/parse-args.js';

export { runMcpHttp } from './server/run-http.js';
export type { McpHttpServerOptions, McpHttpServer } from './server/run-http.js';

export { InMemoryEventStore } from './server/event-store.js';
export type { EventStore, StreamId, EventId } from './server/event-store.js';

export type * from './types/transcend.js';
