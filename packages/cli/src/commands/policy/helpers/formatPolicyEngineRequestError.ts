/** Parsed JSON error body from a Policy Engine API response. */
interface PolicyEngineErrorBody {
  /** Human-readable error message */
  message?: string;
}

/** Shape of a got HTTPError with response metadata. */
interface PolicyEngineHttpError {
  /** HTTP response metadata */
  response?: {
    /** HTTP status code */
    statusCode?: number;
    /** Response body (JSON or raw text) */
    body?: unknown;
  };
}

const AUTH_ERROR_MESSAGE = `Authentication failed (401 Unauthorized).

Your Transcend API key is missing, invalid, or does not have permission for this command.

Fix:
- Set a valid API key: export TRANSCEND_API_KEY=<your-key>
  or pass --auth=<your-key>
- Ensure the key has the required Policy Engine scopes (e.g. View/Manage/Activate Policy)
- Confirm you are pointing at the correct environment (--transcend-url)`;

const PERMISSION_DENIED_MESSAGE = `Permission denied (403 Forbidden).

Your API key is authenticated but does not have the scope required for this command.

Fix:
- Ensure the key has the required Policy Engine scopes (e.g. View/Manage/Activate Policy)
- Contact your Transcend admin to grant the missing scope`;

const NOT_FOUND_MESSAGE = `Resource not found (404 Not Found).

The requested policy bundle or version does not exist.

Fix:
- Check the --bundle-name value
- Run \`transcend policy bundles\` to see available bundles
- Run \`transcend policy versions --bundle-name=<name>\` to see available versions`;

const NETWORK_ERROR_MESSAGE = `Connection to Transcend failed.

The Policy Engine API could not be reached.

Fix:
- Check your network connection
- Confirm --transcend-url points at the correct environment
- Retry the command in a few moments`;

/**
 * Extracts a human-readable message from a Policy Engine API error body.
 *
 * @param body - Raw or parsed response body
 * @returns API message when present
 */
function extractApiMessage(body: unknown): string | undefined {
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as PolicyEngineErrorBody;
      return parsed.message;
    } catch {
      return body.length > 0 ? body : undefined;
    }
  }

  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as PolicyEngineErrorBody).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }

  return undefined;
}

/**
 * Maps common HTTP status codes to actionable CLI messages.
 *
 * @param statusCode - HTTP status code
 * @param apiMessage - Message from the API response body, when present
 * @returns User-readable error text
 */
function formatHttpStatusError(statusCode: number, apiMessage?: string): string {
  switch (statusCode) {
    case 401:
      return AUTH_ERROR_MESSAGE;
    case 403:
      return PERMISSION_DENIED_MESSAGE;
    case 404:
      return NOT_FOUND_MESSAGE;
    case 400:
      return apiMessage ?? 'The request was invalid. Check your command flags and try again.';
    case 409:
      return apiMessage ?? 'The request conflicted with the current policy bundle state.';
    case 422:
      return apiMessage ?? 'The request could not be processed. Check your inputs and try again.';
    default:
      if (statusCode >= 500) {
        return `Transcend server error (${statusCode}). Try again in a few moments. If the problem persists, contact Transcend support.`;
      }
      return apiMessage ?? `Request failed with status code ${statusCode}.`;
  }
}

/**
 * Returns true when the error looks like a network or timeout failure.
 *
 * @param error - Thrown error
 * @returns Whether the error is likely a connectivity issue
 */
function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = (error as NodeJS.ErrnoException).code;
  if (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET'
  ) {
    return true;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('etimedout')
  );
}

/**
 * Extracts a useful error message from a failed Policy Engine HTTP request.
 *
 * @param error - The thrown error, typically a got `HTTPError`
 * @returns A message suitable for CLI output
 */
export function formatPolicyEngineRequestError(error: unknown): string {
  if (isNetworkError(error)) {
    return NETWORK_ERROR_MESSAGE;
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as PolicyEngineHttpError).response;
    const statusCode = response?.statusCode;
    const apiMessage = extractApiMessage(response?.body);

    if (statusCode) {
      return formatHttpStatusError(statusCode, apiMessage);
    }

    if (apiMessage) {
      return apiMessage;
    }
  }

  return error instanceof Error ? error.message : String(error);
}

/**
 * Rethrows a Policy Engine request failure with a user-readable message.
 *
 * @param error - The thrown error, typically a got `HTTPError`
 */
export function throwPolicyEngineRequestError(error: unknown): never {
  throw new Error(formatPolicyEngineRequestError(error), { cause: error });
}

/**
 * Awaits a Policy Engine HTTP request and maps failures to user-readable errors.
 *
 * @param request - Promise returned by a got client call (e.g. `.json()`)
 * @returns Parsed response body
 */
export async function policyEngineRequest<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    throwPolicyEngineRequestError(error);
  }
}
