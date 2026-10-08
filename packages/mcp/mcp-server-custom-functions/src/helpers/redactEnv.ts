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
