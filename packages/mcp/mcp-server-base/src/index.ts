export { authHeaders } from './auth.js';
export type { AuthCredentials, ApiKeyAuth, OAuthTokenAuth, SessionCookieAuth } from './auth.js';

export { requestAuthContext, getRequestAuth } from './auth-context.js';

export {
  MCP_CALLER_HEADER,
  MCP_CLIENT_NAME_HEADER,
  MCP_VERSION_HEADER,
  extractMcpCallerFromHeaders,
  getRequestMcpCaller,
  requestMcpCallerContext,
  resolveMcpCallerAttribution,
  resolveMcpClientName,
  resolveMcpPackageVersion,
} from './mcp-caller-context.js';

export {
  EMPTY_CAPABILITY_REPORT,
  McpClientCapability,
  McpHostClient,
} from './capabilities/types.js';
export type { ClientCapabilityReport } from './capabilities/types.js';
export { deriveClientCapabilities, describeCapabilities } from './capabilities/derive.js';
export type { ClientCapabilitySource } from './capabilities/derive.js';
export {
  ASSUME_CAPABILITIES_ENV_VAR,
  assumedCapabilitiesFromEnv,
  parseAssumedCapabilities,
} from './capabilities/assume.js';
export type { AssumedCapabilities } from './capabilities/assume.js';
export { HOST_QUIRKS, quirksFor, whatIsTheClient } from './capabilities/client-detection.js';
export type { HostQuirks } from './capabilities/client-detection.js';

export {
  getMcpSession,
  hasCapability,
  mcpSessionContext,
  requestElicitation,
} from './mcp-session-context.js';
export type { McpSession } from './mcp-session-context.js';

export { toolCallContext, getToolCallIdHeader, TOOLCALL_ID_HEADER } from './tool-call-context.js';
export type { ToolCallContext } from './tool-call-context.js';

export { TranscendGraphQLBase, SimpleLogger } from './clients/graphql/base.js';
export type { Logger, ListOptions } from './clients/graphql/base.js';
export { TranscendRestClient } from './clients/rest-client.js';
export type {
  CustomFunctionCodeContext,
  CustomFunctionSource,
  SignedCustomFunction,
  TranscendRestClientOptions,
} from './clients/rest-client.js';

export {
  DEFAULT_DASHBOARD_URL,
  DEFAULT_SOMBRA_URL,
  DEFAULT_TRANSCEND_API_URL,
} from './defaults.js';

export {
  ToolError,
  ErrorCode,
  GRAPHQL_ACCESS_DENIED_CODE,
  classifyHttpError,
  classifyGraphQLErrors,
} from './errors.js';
export type { GraphQLErrorItem } from './errors.js';

export { validateArgs, z } from './validation/index.js';
export type { ValidationResult } from './validation/index.js';
export {
  CursorPaginationSchema,
  EmptySchema,
  OffsetPaginationSchema,
  PaginationSchema,
} from './validation/schemas.js';
export { collectMissingDescriptions, MIN_DESCRIPTION_LENGTH } from './validation/describe-audit.js';

export type {
  ToolAnnotations,
  ToolClients,
  ToolConfirmation,
  ToolDefinition,
  ToolUiBinding,
  ToolVisibility,
} from './tools/types.js';
export {
  assertConfirmableAnnotations,
  assertConfirmableSchema,
  DEFAULT_TOOL_VISIBILITY,
  defineTool,
  isVisibleToModel,
} from './tools/types.js';

export { describeArgs } from './tools/describe-args.js';
export type { ConfirmationSummary } from './tools/describe-args.js';

export {
  APPROVAL_TOKEN_ARG,
  canObtainApproval,
  CONFIRMATION_TIMEOUT_MS,
  ConfirmationCode,
  ConfirmationPolicy,
  renderConfirmationPrompt,
  withConfirmation,
} from './tools/confirmation.js';
export type { ConfirmationGate } from './tools/confirmation.js';

export { APPROVAL_TOKEN_TTL_MS, ApprovalTokenStore } from './tools/approval-tokens.js';

export {
  MCP_APP_MIME_TYPE,
  MCP_UI_EXTENSION_ID,
  UI_URI_SCHEME,
  assertHtmlDocument,
  buildUiResourceMeta,
  defineUiResource,
  readUiResourceHtml,
} from './tools/ui-resource.js';
export type {
  UiResourceCsp,
  UiResourceDefinition,
  UiResourcePermissions,
} from './tools/ui-resource.js';

export { DEV_VIEWS_ENV_VAR, devViewsEnabled, viewHtml } from './tools/dev-view-html.js';
export type { ViewHtmlOptions } from './tools/dev-view-html.js';

export {
  assertElicitFormSchema,
  defineToolWithCapabilities,
  expandToolsForClient,
  isCapabilityAwareTool,
  resolveToolVariant,
} from './tools/define-tool-with-capabilities.js';
export type {
  CapabilityAwareToolDefinition,
  ElicitFormSchema,
  ElicitationVariant,
  McpAppVariant,
  ToolVariants,
} from './tools/define-tool-with-capabilities.js';

export { createToolResult, createErrorResult, createListResult, groupBy } from './tools/helpers.js';

export type {
  PromptArgument,
  PromptDefinition,
  PromptMessage,
  PromptMessageContent,
} from './prompts/types.js';

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

export {
  assertMcpSombraAiSettings,
  assertOrganizationMcpSombraEnabled,
  createTranscendRestClient,
  fetchOrganizationSombraContext,
  readSombraEnvConfig,
  resolveSombraHostForMcp,
  resolveSombraHostUrl,
  resolveSombraUrl,
  SOMBRA_CUSTOMER_KEY_ENV,
  SOMBRA_REVERSE_TUNNEL_URLS,
  SOMBRA_URL_ENV,
} from './server/resolve-sombra-url.js';
export type {
  OrganizationAiSetting,
  OrganizationSombraContext,
  ResolveSombraUrlOptions,
} from './server/resolve-sombra-url.js';

export { parseTransportArgs } from './server/parse-args.js';
export type { TransportConfig } from './server/parse-args.js';

export { runMcpHttp } from './server/run-http.js';
export type { McpHttpServerOptions, McpHttpServer } from './server/run-http.js';

export { InMemoryEventStore } from './server/event-store.js';
export type { EventStore, StreamId, EventId } from './server/event-store.js';

export type * from './types/transcend.js';
