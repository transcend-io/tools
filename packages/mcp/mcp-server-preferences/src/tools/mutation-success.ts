/**
 * Whether a Preference Store mutation response should be treated as MCP success.
 * HTTP 200 can still include partial failures in `failures`, `errors`, or per-record flags.
 */
export function isPreferenceMutationSuccessful(result: {
  success?: boolean;
  failures?: unknown[];
  errors?: unknown[];
  records?: { success?: boolean }[];
  nodes?: unknown[];
}): boolean {
  if (result.success === false) {
    return false;
  }
  if ((result.failures?.length ?? 0) > 0) {
    return false;
  }
  if ((result.errors?.length ?? 0) > 0) {
    return false;
  }
  if (result.records?.some((record) => record.success === false)) {
    return false;
  }
  return true;
}

/** Count of failed records for error messaging. */
export function preferenceMutationFailureCount(result: {
  failures?: unknown[];
  errors?: unknown[];
  records?: { success?: boolean }[];
}): number {
  if ((result.failures?.length ?? 0) > 0) {
    return result.failures!.length;
  }
  if ((result.errors?.length ?? 0) > 0) {
    return result.errors!.length;
  }
  return result.records?.filter((record) => record.success === false).length ?? 0;
}

/**
 * Build a tool result that reports Preference Store partial failures as MCP failure,
 * while still returning the API payload (in `data` on success, `details` on failure).
 */
export function preferenceMutationToolResult(
  createToolResult: (
    success: boolean,
    data?: unknown,
    error?: string,
    meta?: { details?: Record<string, unknown> },
  ) => unknown,
  ok: boolean,
  data: Record<string, unknown>,
  failureMessage: string,
): unknown {
  if (ok) {
    return createToolResult(true, data);
  }
  return createToolResult(false, undefined, failureMessage, { details: data });
}
