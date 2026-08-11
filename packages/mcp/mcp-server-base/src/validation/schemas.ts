import { z } from 'zod';

export const EmptySchema = z.object({});

/**
 * Cursor (Relay-style) pagination input. Prefer this whenever the GraphQL field
 * supports `first`/`after` cursors. The shape mirrors GraphQL Connection args
 * one-to-one, with copy tuned for LLM callers.
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
        'Use the smallest value that satisfies the user request to keep responses fast. ' +
        'Paginate with `after` until pageInfo.hasNextPage is false.',
    ),
  after: z
    .string()
    .optional()
    .describe(
      "Opaque cursor from a previous response's pageInfo.endCursor. " +
        'Pass this to fetch the next page; omit for the first page. ' +
        'Prefer cursor pagination (`after`) over offset when this arg is available.',
    ),
});

/**
 * Offset/limit pagination input. Use only when the GraphQL query exposes an
 * offset arg and does not support Relay-style cursors; prefer
 * {@link CursorPaginationSchema} when available.
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
    .describe(
      'Zero-based index of the first result to return. Prefer cursor pagination ' +
        '(`after`) when the tool exposes it instead of offset.',
    ),
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
