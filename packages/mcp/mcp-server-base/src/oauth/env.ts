/** Returns true when running under Vitest or with NODE_ENV=test. */
export function isTestEnv(): boolean {
  return process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
}

/**
 * Returns a test-only environment override, or the production default.
 */
export function resolveTestOverride(envVar: string, productionDefault: string): string {
  if (isTestEnv()) {
    const override = process.env[envVar]?.trim();
    if (override) {
      return override;
    }
  }
  return productionDefault;
}
