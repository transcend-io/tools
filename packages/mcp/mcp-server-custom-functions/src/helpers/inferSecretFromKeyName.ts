/**
 * Heuristic for env var names that should be treated as secrets when the caller
 * did not pass an explicit `isSecret` flag (e.g. `envVarNames` only).
 *
 * @param key - Environment variable name
 * @returns True when the name suggests a credential or secret
 */
export function inferSecretFromKeyName(key: string): boolean {
  const normalized = key.trim().toUpperCase();
  if (normalized === '') {
    return false;
  }
  if (
    normalized.includes('SECRET') ||
    normalized.includes('PASSWORD') ||
    normalized.includes('PASSWD') ||
    normalized.includes('TOKEN') ||
    normalized.includes('API_KEY') ||
    normalized.endsWith('_KEY') ||
    normalized.includes('PRIVATE_KEY') ||
    normalized.includes('CREDENTIAL')
  ) {
    return true;
  }
  return false;
}
