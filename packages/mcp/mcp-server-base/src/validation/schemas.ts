import { z } from 'zod';

export const EmptySchema = z.object({});

/**
 * Page size, shared by both pagination shapes.
 *
 * Callers see `limit`; the GraphQL wire name is `first`, and mixins do that
 * mapping so Relay vocabulary never reaches the tool surface.
 */
const limit = z.coerce
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .default(50)
  .describe('Results per page (1-100, default 50).');

/**
 * Offset pagination — the default for Transcend list tools.
 *
 * Nearly every list field in the GraphQL schema is offset-based: it accepts
 * `first`/`offset` and returns `nodes` + `totalCount` with no `pageInfo`, so
 * `hasNextPage` has to be derived. Build the response with
 * {@link derivePageInfo} rather than hand-rolling the comparison.
 */
export const OffsetPaginationSchema = z.object({
  limit,
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe('Results to skip (default 0).'),
});

/**
 * Cursor pagination — only for sources that hand back a real continuation
 * token. That is a short list: the GraphQL `requests` field (the one payload
 * exposing `pageInfo.endCursor`) and the REST preferences API.
 *
 * Prefer {@link OffsetPaginationSchema} anywhere else; a synthetic cursor over
 * an offset-based field would just be an offset in disguise.
 */
export const CursorPaginationSchema = z.object({
  limit,
  cursor: z.string().optional().describe('Continuation token from the previous response.'),
});
