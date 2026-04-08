import { z } from 'zod';

import { createToolResult } from '../tools/helpers.js';

export { PaginationSchema } from './schemas.js';

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<typeof createToolResult> };

export function validateArgs<T>(
  schema: z.ZodType<T>,
  args: Record<string, unknown>,
): ValidationResult<T> {
  const result = schema.safeParse(args);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issues = result.error.issues
    .map((i) => `${i.path.join('.') || 'input'}: ${i.message}`)
    .join('; ');
  return {
    success: false,
    error: createToolResult(false, undefined, `Invalid input: ${issues}`, {
      code: 'VALIDATION_ERROR',
      retryable: false,
    }),
  };
}

export { z };
