import {
  McpToolErrorCode,
  type McpToolErrorCode as McpToolErrorCodeType,
} from '@transcend-io/privacy-types';

export { McpToolErrorCode };

/**
 * @deprecated Use {@link McpToolErrorCode} from `@transcend-io/privacy-types`.
 */
export const ErrorCode = {
  VALIDATION_ERROR: McpToolErrorCode.ValidationError,
  AUTH_ERROR: McpToolErrorCode.AuthError,
  PERMISSION_ERROR: McpToolErrorCode.PermissionError,
  NOT_FOUND: McpToolErrorCode.NotFound,
  RATE_LIMITED: McpToolErrorCode.RateLimited,
  API_ERROR: McpToolErrorCode.ApiError,
  TIMEOUT: McpToolErrorCode.Timeout,
} as const;

/** @deprecated Use {@link McpToolErrorCode} from `@transcend-io/privacy-types`. */
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Stable GraphQL `errors[].extensions.code` for missing route scopes.
 * Emitted by the Transcend GraphQL server; MCP maps it to {@link McpToolErrorCode.PermissionError}.
 */
export const GRAPHQL_ACCESS_DENIED_CODE = 'ACCESS_DENIED' as const;

/** A single GraphQL error payload (message + optional extensions). */
export interface GraphQLErrorItem {
  /** Human-readable error message */
  message: string;
  /** Structured extensions from the GraphQL server */
  extensions?: Record<string, unknown>;
}

export class ToolError extends Error {
  public readonly code: McpToolErrorCodeType;
  public readonly retryable: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: McpToolErrorCodeType,
    message: string,
    retryable: boolean = false,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}

export function classifyHttpError(status: number, body: string): ToolError {
  if (status === 401 || status === 403) {
    return new ToolError(
      McpToolErrorCode.AuthError,
      `Authentication failed (${status}): ${body}`,
      false,
    );
  }
  if (status === 404) {
    return new ToolError(McpToolErrorCode.NotFound, `Resource not found (404): ${body}`, false);
  }
  if (status === 429) {
    return new ToolError(McpToolErrorCode.RateLimited, `Rate limited (429): ${body}`, true);
  }
  if (status >= 400 && status < 500) {
    return new ToolError(McpToolErrorCode.ApiError, `Client error (${status}): ${body}`, false);
  }
  return new ToolError(McpToolErrorCode.ApiError, `Server error (${status}): ${body}`, true);
}

/**
 * Map GraphQL `errors[]` to a {@link ToolError}.
 *
 * When any error has `extensions.code === "ACCESS_DENIED"`, returns
 * {@link McpToolErrorCode.PermissionError} with optional `route` / `requiredScopes`
 * details from the first such error. Otherwise returns {@link McpToolErrorCode.ApiError}.
 */
export function classifyGraphQLErrors(errors: GraphQLErrorItem[]): ToolError {
  const errorMessages = errors.map((e) => e.message).join('; ');
  const message = `GraphQL errors: ${errorMessages}`;

  const accessDenied = errors.find((e) => e.extensions?.code === GRAPHQL_ACCESS_DENIED_CODE);

  if (!accessDenied) {
    return new ToolError(McpToolErrorCode.ApiError, message, false);
  }

  const details: Record<string, unknown> = {};
  const { extensions } = accessDenied;

  if (typeof extensions?.route === 'string') {
    details.route = extensions.route;
  }
  if (Array.isArray(extensions?.requiredScopes)) {
    details.requiredScopes = extensions.requiredScopes.filter(
      (scope): scope is string => typeof scope === 'string',
    );
  }

  return new ToolError(
    McpToolErrorCode.PermissionError,
    message,
    false,
    Object.keys(details).length > 0 ? details : undefined,
  );
}
