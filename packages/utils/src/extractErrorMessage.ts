/** Maximum characters preserved from a raw, non-JSON response body before truncation. */
const MAX_RAW_BODY_LENGTH = 200;

/** Lookup for status code reasons used when `response.statusMessage` is missing. */
const STATUS_REASONS: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  408: 'Request Timeout',
  409: 'Conflict',
  413: 'Payload Too Large',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

/**
 * Extract a human-readable error message from a thrown error.
 *
 * Tries to parse JSON bodies that follow common REST/GraphQL error patterns:
 *   { error: { message: string } }
 *   { errors: [{ message: string }, ...] }
 *
 * For HTML / plaintext 5xx/4xx bodies from upstream gateways (e.g. an ALB
 * serving a `<html>...502 Bad Gateway...</html>` page) we fall back to a
 * compact `HTTP <code> <reason>` string rather than leaking the raw HTML
 * into logs.
 *
 * Falls back to `err.message` or 'Unknown error' otherwise.
 *
 * @param err - Unknown error thrown by network call
 * @returns A concise error string safe to log/show
 */
export function extractErrorMessage(err: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = err as any;
  const statusCode: number | undefined = anyErr?.response?.statusCode;
  const statusMessage: string | undefined = anyErr?.response?.statusMessage;
  const rawBody: string | undefined = anyErr?.response?.body;
  const fallback: string = anyErr?.message || 'Unknown error';

  if (!rawBody) {
    return fallback;
  }

  // Prefer structured JSON error bodies when the server provided them.
  try {
    const parsed = JSON.parse(rawBody);
    const candidates = parsed.errors ||
      parsed.error?.errors || [parsed.error?.message || parsed.error];

    const msgs = Array.isArray(candidates) ? candidates : [candidates];
    const joined = msgs.filter(Boolean).join(', ');
    if (joined) {
      return joined;
    }
  } catch {
    // not JSON, continue to the HTML / plaintext branch below.
  }

  // Non-JSON body (most often an HTML error page from a gateway / load
  // balancer). Prefer a compact `HTTP 502 Bad Gateway`-style summary when we
  // know the status code.
  if (typeof statusCode === 'number') {
    const reason = statusMessage || STATUS_REASONS[statusCode] || '';
    return reason ? `HTTP ${statusCode} ${reason}` : `HTTP ${statusCode}`;
  }

  // Last resort: return the raw body, capped so we don't flood logs.
  return rawBody.length > MAX_RAW_BODY_LENGTH
    ? `${rawBody.slice(0, MAX_RAW_BODY_LENGTH)}... (truncated)`
    : rawBody;
}
