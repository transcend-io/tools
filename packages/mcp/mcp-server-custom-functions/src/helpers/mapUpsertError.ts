/**
 * Rewrite known GraphQL create failures into agent-recoverable guidance.
 *
 * @param error - Thrown GraphQL or validation error
 * @returns Mapped Error when the message matches a known attach failure
 */
export function mapCustomFunctionUpsertError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (
    /NOT_CONFIGURED|connectionState|already (has|configured)|one .+ per silo|data silo.+eligib/i.test(
      message,
    )
  ) {
    return new Error(
      'DSR Custom Functions attach 1:1 to a CUSTOM_FUNCTION data silo that is still ' +
        'NOT_CONFIGURED (CONNECTED silos already have a function). Call ' +
        'inventory_get_data_silo to check connectionState, or omit dataSiloId on ' +
        'custom_functions_upsert to auto-create an eligible silo. Original error: ' +
        message,
    );
  }
  return error instanceof Error ? error : new Error(message);
}
