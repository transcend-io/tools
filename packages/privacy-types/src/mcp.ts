/**
 * Stable MCP tool failure codes returned in CallToolResult JSON.
 *
 * Canonical home for codes formerly defined as `ErrorCode` in
 * `@transcend-io/mcp-server-base`.
 */
export const McpToolErrorCode = {
  /** Invalid tool arguments or request shape. */
  ValidationError: 'VALIDATION_ERROR',
  /** Missing or invalid credentials (HTTP 401/403, OAuth failures). */
  AuthError: 'AUTH_ERROR',
  /** Missing GraphQL route scopes (or similar authorization denial). */
  PermissionError: 'PERMISSION_ERROR',
  /** Requested resource does not exist. */
  NotFound: 'NOT_FOUND',
  /** Upstream rate limit; may be retried. */
  RateLimited: 'RATE_LIMITED',
  /** Generic API / GraphQL failure. */
  ApiError: 'API_ERROR',
  /** Request aborted due to timeout; may be retried. */
  Timeout: 'TIMEOUT',
} as const;

/** Union of wire values for {@link McpToolErrorCode}. */
export type McpToolErrorCode = (typeof McpToolErrorCode)[keyof typeof McpToolErrorCode];

/** Category for MCP feature requests filed from signed-in clients. */
export const McpFeatureRequestCategory = {
  MissingTool: 'MISSING_TOOL',
  MissingField: 'MISSING_FIELD',
  MissingFilter: 'MISSING_FILTER',
  Other: 'OTHER',
} as const;

export type McpFeatureRequestCategory =
  (typeof McpFeatureRequestCategory)[keyof typeof McpFeatureRequestCategory];

/**
 * Domain MCP server identifiers (excludes docs, which uses no API scopes).
 * Wire values match {@link https://github.com/transcend-io/tools/pull/790 | SDK OAuth scope centralization}.
 */
export const TranscendMcpServer = {
  Admin: 'admin',
  Assessment: 'assessment',
  Config: 'config',
  Consent: 'consent',
  CustomFunctions: 'customFunctions',
  Discovery: 'discovery',
  Dsr: 'dsr',
  Inventory: 'inventory',
  Policy: 'policy',
  Preferences: 'preferences',
  PrivacyCenter: 'privacyCenter',
  Workflows: 'workflows',
} as const;

export type TranscendMcpServer = (typeof TranscendMcpServer)[keyof typeof TranscendMcpServer];
