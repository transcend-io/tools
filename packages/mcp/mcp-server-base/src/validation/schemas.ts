import { z } from 'zod';

export const EmptySchema = z.object({});

/**
 * Cursor (Relay-style) pagination input. Use this for any GraphQL `Connection`
 * field exposed as an MCP tool. The shape mirrors GraphQL's `first`/`after`
 * args one-to-one, with copy tuned for LLM callers.
 */
export const CursorPaginationSchema = z.object({
  first: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe(
      'Maximum number of results to return per page (1-100, default 50). ' +
        'Use the smallest value that satisfies the user request to keep responses fast.',
    ),
  after: z
    .string()
    .optional()
    .describe(
      "Opaque cursor from a previous response's pageInfo.endCursor. " +
        'Pass this to fetch the next page; omit for the first page.',
    ),
});

/**
 * Offset/limit pagination input. Use this for GraphQL queries that expose
 * an offset arg instead of a Relay-style cursor (e.g. legacy admin lists).
 */
export const OffsetPaginationSchema = z.object({
  first: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe('Maximum number of results to return (1-100, default 50).'),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe('Zero-based index of the first result to return.'),
});

/**
 * @deprecated Prefer `CursorPaginationSchema` (cursor pagination) or
 * `OffsetPaginationSchema` (offset pagination). Kept for backwards
 * compatibility with existing tools that mix Relay cursor + arbitrary `limit`.
 */
export const PaginationSchema = z.object({
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe('Results per page (1-100, default: 50)'),
  cursor: z.string().optional().describe('Pagination cursor from previous response'),
});
