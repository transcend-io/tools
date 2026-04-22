import { ToolError } from '../errors.js';

export function createToolResult(
  success: boolean,
  data?: unknown,
  error?: string,
  meta?: { code?: string; retryable?: boolean },
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
    timestamp: new Date().toISOString(),
  };
}

export function createErrorResult(error: unknown): unknown {
  if (error instanceof ToolError) {
    return createToolResult(false, undefined, error.message, {
      code: error.code,
      retryable: error.retryable,
    });
  }
  return createToolResult(false, undefined, error instanceof Error ? error.message : String(error));
}

export function createListResult(
  items: unknown[],
  options?: {
    totalCount?: number;
    hasNextPage?: boolean;
    cursor?: string;
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
