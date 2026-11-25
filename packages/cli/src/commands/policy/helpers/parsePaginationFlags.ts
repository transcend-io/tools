/** Maximum page size accepted by the Policy Engine list endpoints. */
export const MAX_POLICY_LIMIT = 100;

/**
 * Parses a `--limit` value for Policy Engine list commands.
 *
 * Requires a positive integer and enforces the server-side cap of
 * {@link MAX_POLICY_LIMIT} client-side so that an over-large page size is
 * rejected with a clear message instead of an opaque server `400`.
 *
 * @param value - Raw CLI input
 * @returns Validated limit
 */
export function parseLimitParam(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`--limit must be a positive integer (received "${value}")`);
  }
  if (parsed > MAX_POLICY_LIMIT) {
    throw new Error(`--limit must be at most ${MAX_POLICY_LIMIT} (received "${value}")`);
  }
  return parsed;
}

/**
 * Parses an `--offset` value for offset-paginated Policy Engine commands.
 *
 * Requires a non-negative integer. Fractional values (e.g. `2.5`) are rejected
 * client-side rather than forwarded to the server as an opaque `400`.
 *
 * @param value - Raw CLI input
 * @returns Validated offset
 */
export function parseOffsetParam(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`--offset must be a non-negative integer (received "${value}")`);
  }
  return parsed;
}
