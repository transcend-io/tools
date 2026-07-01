/** Parsed JSON error body from a Policy Engine API response. */
interface PolicyEngineErrorBody {
  /** Human-readable error message */
  message?: string;
}

/**
 * Extracts a useful error message from a failed Policy Engine HTTP request.
 *
 * @param error - The thrown error, typically a got `HTTPError`
 * @returns A message suitable for CLI output
 */
export function formatPolicyEngineRequestError(error: unknown): string {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return error instanceof Error ? error.message : String(error);
  }

  const response = (error as { response?: { body?: unknown } }).response;
  const body = response?.body;

  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as PolicyEngineErrorBody;
      if (parsed.message) {
        return parsed.message;
      }
    } catch {
      return body;
    }
  }

  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as PolicyEngineErrorBody).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }

  return error instanceof Error ? error.message : String(error);
}
