const ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const RESERVED_EXACT = new Set([
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NPM_CONFIG_REGISTRY',
  'NO_COLOR',
  'NO_PROXY',
  'NODE_EXTRA_CA_CERTS',
]);

/**
 * Whether an environment variable name is allowed for Custom Functions.
 *
 * @param key - Proposed variable name
 * @returns Error message when invalid, otherwise undefined
 */
export function validateEnvironmentVariableKey(key: string): string | undefined {
  const trimmed = key.trim();
  if (trimmed === '') {
    return 'Environment variable key must not be empty.';
  }
  if (!ENV_NAME_PATTERN.test(trimmed)) {
    return (
      `Environment variable "${trimmed}" must match ^[A-Za-z_][A-Za-z0-9_]*$ ` +
      '(CONSTANT_CASE by convention).'
    );
  }
  const upper = trimmed.toUpperCase();
  if (upper.startsWith('DENO_') || RESERVED_EXACT.has(upper)) {
    return `Environment variable "${trimmed}" is reserved by the Custom Function runtime.`;
  }
  return undefined;
}
