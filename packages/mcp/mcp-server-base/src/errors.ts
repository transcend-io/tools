export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  API_ERROR = 'API_ERROR',
  TIMEOUT = 'TIMEOUT',
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
