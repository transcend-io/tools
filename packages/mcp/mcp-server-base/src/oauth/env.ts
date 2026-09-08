/** Environment variable that enables test-only URL overrides when set to `1`. */
export const ALLOW_TEST_OVERRIDES_ENV = 'ALLOW_TEST_OVERRIDES';

/** Environment variable that disables server confirmation gates when set to `1`. */
export const MCP_SKIP_CONFIRMATION_ENV = 'MCP_SKIP_CONFIRMATION';

/**
 * Returns true when test-only environment overrides are enabled.
 * Requires `ALLOW_TEST_OVERRIDES=1`; unset or any other value is treated as disabled.
 */
export function allowTestOverrides(): boolean {
  return process.env[ALLOW_TEST_OVERRIDES_ENV] === '1';
}

/**
 * Returns true when consequential tool confirmation gates are bypassed.
 * Requires `MCP_SKIP_CONFIRMATION=1`; unset or any other value keeps gates enabled.
 */
export function skipConfirmation(): boolean {
  return process.env[MCP_SKIP_CONFIRMATION_ENV] === '1';
}

/**
 * Returns a test-only environment override, or the production default.
 */
export function resolveTestOverride(envVar: string, productionDefault: string): string {
  if (allowTestOverrides()) {
    const override = process.env[envVar]?.trim();
    if (override) {
      return override;
    }
  }
  return productionDefault;
}
