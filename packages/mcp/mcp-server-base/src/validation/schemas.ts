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

/**
 * The `.min(1)` message shared by every optional list filter.
 *
 * Exported separately for arrays whose elements are not plain strings — an enum
 * array cannot use {@link nonEmptyList} but should still fail in the same words.
 *
 * @param subject - Singular noun for one element, e.g. `template ID`
 * @returns The validation message
 */
export function nonEmptyListMessage(subject = 'value'): string {
  return `Pass at least one ${subject}, or omit the filter entirely.`;
}

/**
 * An optional list filter that rejects `[]`.
 *
 * Empty arrays are dropped during filter assembly, so a caller that resolved a
 * lookup to nothing and passed the result through would have its filter read as
 * "no filter given" and get back every record in the organization — the widest
 * possible answer to a query that should have matched none.
 *
 * @param description - What the filter selects, as the model should read it
 * @param subject - Singular noun for one element, e.g. `template ID`
 * @returns An optional array-of-strings schema
 */
export function nonEmptyList(description: string, subject = 'value') {
  return z
    .array(z.string())
    .min(1, { message: nonEmptyListMessage(subject) })
    .optional()
    .describe(description);
}

/**
 * A date-bound filter that accepts a bare date or a full timestamp, since the
 * GraphQL `Date` scalar takes both and callers phrase cutoffs either way.
 *
 * Deliberately left without a `describe()`: only the caller knows whether the
 * bound is inclusive, and which side of the range it is.
 *
 * @param field - Parameter name, used in the validation message
 * @returns An optional ISO 8601 date string schema
 */
export function isoDate(field: string) {
  return z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}([T ].*)?$/, {
      message: `${field} must be an ISO 8601 date, e.g. 2026-01-31 or 2026-01-31T00:00:00Z`,
    })
    .optional();
}
