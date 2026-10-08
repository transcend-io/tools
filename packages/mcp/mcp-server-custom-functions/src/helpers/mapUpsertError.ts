import { ErrorCode, ToolError } from '@transcend-io/mcp-server-base';

/**
 * Rewrite known GraphQL create failures into agent-recoverable guidance.
 *
 * @param error - Thrown GraphQL or validation error
 * @param context - Optional IDs for structured recovery hints
 * @returns Mapped ToolError when the message matches a known attach failure
 */
export function mapCustomFunctionUpsertError(
  error: unknown,
  context: { dataSiloId?: string } = {},
): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (/NOT_CONFIGURED|connectionState/i.test(message)) {
    return new ToolError(
      ErrorCode.VALIDATION_ERROR,
      'DSR Custom Functions attach 1:1 to a CUSTOM_FUNCTION data silo that is still ' +
        'NOT_CONFIGURED (CONNECTED silos already have a function). Call ' +
        'inventory_get_data_silo to check connectionState, or omit dataSiloId on ' +
        'custom_functions_upsert to auto-create an eligible silo. Original error: ' +
        message,
      false,
      {
        dataSiloId: context.dataSiloId,
        recoveryTool: 'inventory_get_data_silo',
      },
    );
  }
  return error instanceof Error ? error : new Error(message);
}
