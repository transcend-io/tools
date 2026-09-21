/**
 * Placeholder shown instead of plaintext environment-variable values.
 * Secrets are set in the Admin Dashboard, not via MCP.
 */
export const ENV_VALUE_SET_IN_DASHBOARD = '[set in dashboard]';

/**
 * Non-empty sentinel written for newly declared env names.
 *
 * Sombra merge-on-sign treats `''` as “keep prior ciphertext”; for a *new* key
 * with no prior ciphertext that drops the name entirely. A non-empty placeholder
 * creates the encrypted slot so the user can replace it in the dashboard.
 *
 * @param name - Environment variable name
 * @returns Placeholder value for `userDefinedEnv[name]`
 */
export function unsetEnvPlaceholder(name: string): string {
  return `\${${name}}`;
}

/**
 * Replace environment-variable values with a dashboard placeholder so agents
 * never receive secrets from `custom_functions_get_code`.
 *
 * @param userDefinedEnv - Plaintext env map from unwrap
 * @returns Map with the same keys and redacted values
 */
export function redactUserDefinedEnv(
  userDefinedEnv: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.keys(userDefinedEnv).map((name) => [name, ENV_VALUE_SET_IN_DASHBOARD]),
  );
}

/**
 * Build the env map to sign: keep stored secret values, and add placeholder
 * slots for any new names the agent declared (user fills values in the dashboard).
 *
 * Omitting `envVarNames` leaves `stored` unchanged (or `{}` when creating).
 * Names already present keep their stored values. MCP never writes secret values.
 *
 * New names use {@link unsetEnvPlaceholder} — not `''` — because empty string is
 * merge-on-sign “keep prior” and drops keys with no prior ciphertext.
 *
 * @param options - Stored env and optional names to ensure exist
 * @returns Env map for `signCustomFunction`
 */
export function mergeEnvVarNames(options: {
  /** Existing env from unwrap; omit on create */
  stored?: Record<string, string>;
  /** Names to ensure exist as placeholders when missing */
  envVarNames?: string[];
}): Record<string, string> {
  const result: Record<string, string> = { ...(options.stored ?? {}) };
  for (const name of options.envVarNames ?? []) {
    if (!(name in result)) {
      result[name] = unsetEnvPlaceholder(name);
    }
  }
  return result;
}
