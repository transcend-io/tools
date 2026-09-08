import { ToolError } from '../errors.js';

export function createToolResult(
  /** Whether the tool call succeeded */
  success: boolean,
  /** Result payload when successful */
  data?: unknown,
  /** Human-readable error message when unsuccessful */
  error?: string,
  /** Structured error metadata for unsuccessful results */
  meta?: {
    /** Machine-readable error code */
    code?: string;
    /** Whether the caller may retry the operation */
    retryable?: boolean;
    /** Structured error details (e.g. route, requiredScopes) */
    details?: Record<string, unknown>;
  },
): unknown {
  if (success) {
    return {
      success: true,
      ...(data !== undefined && { data }),
      timestamp: new Date().toISOString(),
    };
  }
  return {
    success: false,
    error: error || 'Unknown error',
    ...(meta?.code && { code: meta.code }),
    ...(meta?.retryable !== undefined && { retryable: meta.retryable }),
    ...(meta?.details && Object.keys(meta.details).length > 0 && { details: meta.details }),
    timestamp: new Date().toISOString(),
  };
}

export function createErrorResult(
  /** Thrown value or ToolError to serialize into a tool result */
  error: unknown,
): unknown {
  if (error instanceof ToolError) {
    return createToolResult(false, undefined, error.message, {
      code: error.code,
      retryable: error.retryable,
      details: error.details,
    });
  }
  return createToolResult(false, undefined, error instanceof Error ? error.message : String(error));
}

export function createListResult(
  /** Items for the current page */
  items: unknown[],
  /** Optional pagination metadata */
  options?: {
    /** Total number of items available across all pages */
    totalCount?: number;
    /** Whether another page of results exists */
    hasNextPage?: boolean;
    /** Cursor for fetching the next page */
    cursor?: string;
    /** Human-readable note about pagination behavior */
    paginationNote?: string;
  },
): unknown {
  return {
    success: true,
    data: items,
    count: items.length,
    ...(options?.totalCount !== undefined && { totalCount: options.totalCount }),
    ...(options?.hasNextPage !== undefined && { hasNextPage: options.hasNextPage }),
    ...(options?.cursor && { nextCursor: options.cursor }),
    ...(options?.paginationNote && { paginationNote: options.paginationNote }),
    timestamp: new Date().toISOString(),
  };
}

/**
 * A `paginationNote` for a list that came back empty, naming the filters that
 * were applied.
 *
 * An empty `data` array reads exactly like a failed lookup. Cold-read agents
 * that hit one spend a second, unfiltered call re-deriving the answer by hand
 * before they will trust the zero, or report the emptiness as a tool failure.
 * Saying the query succeeded, and against what, is what makes the zero usable.
 *
 * @param subject - Plural noun for what was being listed, e.g. `data silos`
 * @param appliedFilters - Names of the filters, as the caller passed them
 * @returns The note to attach to the empty page
 */
export function describeNoMatches(subject: string, appliedFilters: string[]): string {
  if (appliedFilters.length === 0) {
    return `This organization has no ${subject}. The query succeeded.`;
  }
  return (
    `No ${subject} match the filters applied (${appliedFilters.join(', ')}). ` +
    'The query succeeded; relax or drop a filter rather than retrying it unchanged.'
  );
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, number> {
  return array.reduce(
    (groups, item) => {
      const value = String(item[key]);
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    },
    {} as Record<string, number>,
  );
}
