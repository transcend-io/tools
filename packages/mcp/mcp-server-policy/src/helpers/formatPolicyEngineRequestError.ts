import { MAX_BUNDLE_COMPRESSED_BYTES, MAX_BUNDLE_DECOMPRESSED_BYTES } from '@transcend-io/utils';

/** Parsed JSON error body from a Policy Engine API response. */
interface PolicyEngineErrorBody {
  /** Human-readable error message */
  message?: string;
}

/** HTTP response metadata on a got HTTPError. */
interface PolicyEngineHttpResponse {
  /** HTTP status code */
  statusCode?: number;
  /** Response body (JSON or raw text) */
  body?: unknown;
  /** Response headers */
  headers?: Record<string, string | string[] | undefined>;
}

/** Shape of a got HTTPError with response metadata. */
interface PolicyEngineHttpError {
  /** HTTP response metadata */
  response?: PolicyEngineHttpResponse;
}

const NETWORK_ERROR_HINTS = [
  'network',
  'timeout',
  'econnrefused',
  'enotfound',
  'etimedout',
] as const;

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
 * Maps common HTTP status codes to actionable messages.
 *
 * @param statusCode - HTTP status code
 * @param apiMessage - Message from the API response body, when present
 * @returns User-readable error text
 */
function formatHttpStatusError(statusCode: number, apiMessage?: string): string {
  switch (statusCode) {
    case 400:
      return apiMessage ?? 'The request was invalid. Check your inputs and try again.';
    case 401:
      return 'Authentication failed (401). Verify your API key or OAuth token has Policy Engine scopes.';
    case 403:
      return apiMessage ?? 'Access was denied (403 Forbidden).';
    case 404:
      return (
        apiMessage ??
        'Policy bundle or version not found. Use policy_status to list bundles and versions.'
      );
    case 409:
      return apiMessage ?? 'The request conflicted with the current policy bundle state.';
    case 413:
      return (
        apiMessage ??
        `Policy bundle upload is too large (max ${MAX_BUNDLE_COMPRESSED_BYTES / 1024} KiB compressed, ${MAX_BUNDLE_DECOMPRESSED_BYTES / 1024} KiB decompressed).`
      );
    case 429:
      return apiMessage ?? 'Rate limit exceeded (429). Wait and retry.';
    default:
      if (statusCode >= 500) {
        return `Transcend server error (${statusCode}). Try again in a few moments.`;
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
  return NETWORK_ERROR_HINTS.some((hint) => message.includes(hint));
}

/**
 * Extracts a useful error message from a failed Policy Engine HTTP request.
 *
 * Adapted from `@transcend-io/cli` policy helpers.
 *
 * @param error - The thrown error, typically a got `HTTPError`
 * @returns A message suitable for tool output
 */
export function formatPolicyEngineRequestError(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Connection to Transcend failed. Check your network and TRANSCEND_API_URL.';
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
 * Awaits a Policy Engine HTTP request and maps failures to user-readable errors.
 *
 * @param request - Promise returned by a got client call (e.g. `.json()`)
 * @returns Parsed response body
 */
export async function policyEngineRequest<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    throw new Error(formatPolicyEngineRequestError(error), { cause: error });
  }
}
