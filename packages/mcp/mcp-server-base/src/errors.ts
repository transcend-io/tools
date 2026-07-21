export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  /** Missing GraphQL route scopes (or similar authorization denial). */
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  API_ERROR = 'API_ERROR',
  TIMEOUT = 'TIMEOUT',
}

/**
 * Stable GraphQL `errors[].extensions.code` for missing route scopes.
 * Emitted by the Transcend GraphQL server; MCP maps it to {@link ErrorCode.PERMISSION_ERROR}.
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
  public readonly code: ErrorCode;
  public readonly retryable: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
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
    return new ToolError(ErrorCode.AUTH_ERROR, `Authentication failed (${status}): ${body}`, false);
  }
  if (status === 404) {
    return new ToolError(ErrorCode.NOT_FOUND, `Resource not found (404): ${body}`, false);
  }
  if (status === 429) {
    return new ToolError(ErrorCode.RATE_LIMITED, `Rate limited (429): ${body}`, true);
  }
  if (status >= 400 && status < 500) {
    return new ToolError(ErrorCode.API_ERROR, `Client error (${status}): ${body}`, false);
  }
  return new ToolError(ErrorCode.API_ERROR, `Server error (${status}): ${body}`, true);
}

/**
 * Map GraphQL `errors[]` to a {@link ToolError}.
 *
 * When any error has `extensions.code === "ACCESS_DENIED"`, returns
 * {@link ErrorCode.PERMISSION_ERROR} with optional `route` / `requiredScopes`
 * details from the first such error. Otherwise returns {@link ErrorCode.API_ERROR}.
 */
export function classifyGraphQLErrors(errors: GraphQLErrorItem[]): ToolError {
  const errorMessages = errors.map((e) => e.message).join('; ');
  const message = `GraphQL errors: ${errorMessages}`;

  const accessDenied = errors.find((e) => e.extensions?.code === GRAPHQL_ACCESS_DENIED_CODE);

  if (!accessDenied) {
    return new ToolError(ErrorCode.API_ERROR, message, false);
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
    ErrorCode.PERMISSION_ERROR,
    message,
    false,
    Object.keys(details).length > 0 ? details : undefined,
  );
}
