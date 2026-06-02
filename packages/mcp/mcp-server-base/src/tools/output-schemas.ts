import { z } from 'zod';

/**
 * Validates the success branch of the standard tool envelope:
 * `{ success: true, data, timestamp }`.
 */
export const successEnvelopeSchema = <T extends z.ZodTypeAny>(
  dataSchema: T,
): z.ZodObject<{
  success: z.ZodLiteral<true>;
  data: T;
  timestamp: z.ZodString;
}> =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    timestamp: z.string(),
  });

/**
 * Validates the error branch of the standard tool envelope:
 * `{ success: false, error?, message?, code?, retryable?, timestamp }`.
 *
 * `error` and `message` are both optional because legacy callers (and the
 * `createErrorResult` helper) populate one or the other depending on whether
 * the failure originated from a `ToolError` with metadata.
 */
export const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.string().optional(),
  message: z.string().optional(),
  code: z.string().optional(),
  retryable: z.boolean().optional(),
  timestamp: z.string(),
});

/**
 * The standard envelope every Transcend MCP tool resolves to.
 *
 * Every tool's `handler` ultimately returns one of these two shapes:
 * - `{ success: true, data, timestamp }` on success
 * - `{ success: false, error?, message?, code?, retryable?, timestamp }` on failure
 *
 * Use this helper as the `outputZodSchema` of any tool that returns a single
 * payload (mutation result, single record fetch, etc.). For paginated list
 * tools, prefer {@link listEnvelopeSchema} so the inner `data` shape is
 * `{ items, count, totalCount?, hasNextPage?, nextCursor?, paginationNote? }`.
 */
export const envelopeSchema = <T extends z.ZodTypeAny>(
  dataSchema: T,
): z.ZodDiscriminatedUnion<
  [ReturnType<typeof successEnvelopeSchema<T>>, typeof errorEnvelopeSchema]
> => z.discriminatedUnion('success', [successEnvelopeSchema(dataSchema), errorEnvelopeSchema]);

/**
 * Inner payload shape produced by `createListResult` once pagination metadata
 * is nested under `data`. Pair with {@link envelopeSchema} (or use
 * {@link listEnvelopeSchema}) to describe a paginated list-tool response.
 */
export const paginatedListSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
): z.ZodObject<{
  items: z.ZodArray<T>;
  count: z.ZodNumber;
  totalCount: z.ZodOptional<z.ZodNumber>;
  hasNextPage: z.ZodOptional<z.ZodBoolean>;
  nextCursor: z.ZodOptional<z.ZodString>;
  paginationNote: z.ZodOptional<z.ZodString>;
}> =>
  z.object({
    items: z.array(itemSchema),
    count: z.number(),
    totalCount: z.number().optional(),
    hasNextPage: z.boolean().optional(),
    nextCursor: z.string().optional(),
    paginationNote: z.string().optional(),
  });

/**
 * Convenience wrapper for paginated list tools. Equivalent to
 * `envelopeSchema(paginatedListSchema(itemSchema))`.
 */
export const listEnvelopeSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
): ReturnType<typeof envelopeSchema<ReturnType<typeof paginatedListSchema<T>>>> =>
  envelopeSchema(paginatedListSchema(itemSchema));
