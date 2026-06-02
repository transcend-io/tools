import { z } from 'zod';

/**
 * Wrap a Zod object schema (typically generated from a GraphQL `input` type
 * by `graphql-codegen-typescript-validation-schema`) so every field carries a
 * human-authored description.
 *
 * Why this exists:
 *   - MCP tools surface their input schema verbatim to the LLM caller. Missing
 *     descriptions cause the model to guess at field semantics, which leads
 *     to malformed inputs and hallucinated values.
 *   - GraphQL `input` types frequently lack descriptions (or carry terse SDL
 *     descriptions that don't translate well to LLM prompts). `withDescriptions`
 *     forces every consumer to author copy that's tuned for an LLM audience.
 *   - The TypeScript compiler enforces that the `descriptions` map covers
 *     every field of the wrapped schema -- if codegen adds a new field to the
 *     input type, the call site fails to typecheck until copy is added.
 *
 * Implementation note: `ZodRawShape` in Zod 4 is the *core* shape type, whose
 * member types don't expose the `.describe()` chain. We cast the field through
 * `z.ZodType` (the classic surface, which is what `z.object(...)` actually
 * produces at runtime) to attach the description without losing the inferred
 * outer shape type.
 */
export function withDescriptions<TShape extends z.ZodRawShape>(
  schema: z.ZodObject<TShape>,
  descriptions: { readonly [K in keyof TShape]-?: string },
): z.ZodObject<TShape> {
  const shape = schema.shape;
  const next: Record<string, z.ZodType> = {};
  for (const key of Object.keys(shape) as (keyof TShape & string)[]) {
    const description = descriptions[key];
    if (typeof description !== 'string' || description.length === 0) {
      throw new Error(
        `withDescriptions: missing or empty description for field '${String(key)}'. ` +
          'Every input field surfaced to an LLM must carry a description.',
      );
    }
    const field = shape[key] as unknown as z.ZodType;
    next[key] = field.describe(description);
  }
  return z.object(next) as unknown as z.ZodObject<TShape>;
}
