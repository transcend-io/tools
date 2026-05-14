export { authHeaders } from './auth.js';
export type { AuthCredentials, ApiKeyAuth, SessionCookieAuth } from './auth.js';

export { requestAuthContext, getRequestAuth } from './auth-context.js';

export {
  MCP_CALLER_HEADER,
  extractMcpCallerFromHeaders,
  getRequestMcpCaller,
  requestMcpCallerContext,
} from './mcp-caller-context.js';

export { toolCallContext, getToolCallIdHeader, TOOLCALL_ID_HEADER } from './tool-call-context.js';
export type { ToolCallContext } from './tool-call-context.js';

export { TranscendGraphQLBase, SimpleLogger } from './clients/graphql/base.js';
export type { Logger, ListOptions } from './clients/graphql/base.js';
export { TranscendRestClient } from './clients/rest-client.js';

export {
  DEFAULT_DASHBOARD_URL,
  TRANSCEND_DASHBOARD_URL_ENV,
  resolveDashboardUrl,
} from './dashboard-url.js';

export { ToolError, ErrorCode, classifyHttpError } from './errors.js';

export { validateArgs, z } from './validation/index.js';
export type { ValidationResult } from './validation/index.js';
export { EmptySchema, PaginationSchema } from './validation/schemas.js';

export type { ToolAnnotations, ToolDefinition, ToolClients } from './tools/types.js';
export { defineTool } from './tools/types.js';

export { createToolResult, createErrorResult, createListResult, groupBy } from './tools/helpers.js';

export { createMCPServer } from './server/create-server.js';
export type { MCPServerOptions } from './server/create-server.js';

export { buildMcpServer } from './server/build-server.js';
export type { BuildMcpServerOptions } from './server/build-server.js';

export { resolveAuth, tryResolveAuth, extractApiKeyFromHeaders } from './server/resolve-auth.js';

export { parseTransportArgs } from './server/parse-args.js';
export type { TransportConfig } from './server/parse-args.js';

export { runMcpHttp } from './server/run-http.js';
export type { McpHttpServerOptions, McpHttpServer } from './server/run-http.js';

export { InMemoryEventStore } from './server/event-store.js';
export type { EventStore, StreamId, EventId } from './server/event-store.js';

export type * from './types/transcend.js';
