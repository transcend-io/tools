import { Buffer } from 'node:buffer';
import { isIP } from 'node:net';

/** Maximum environment value size supported by the local process. */
export const CUSTOM_FUNCTION_MAX_ENV_VALUE_BYTES = 64 * 1024;

const RESERVED_ENV_NAMES = new Set([
  'DENO_CERT',
  'DENO_DIR',
  'DENO_TLS_CA_STORE',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NODE_EXTRA_CA_CERTS',
  'NO_COLOR',
  'NO_PROXY',
  'NPM_CONFIG_REGISTRY',
]);

/**
 * Check whether a value matches Sombra's hostname/IP contract.
 *
 * @param host - Manifest allowed-host value
 * @returns Whether the host is valid
 */
function isValidAllowedHost(host: string): boolean {
  const bracketedIp = /^\[([^\]]+)\](?::(\d+))?$/u.exec(host);
  if (bracketedIp) {
    const port = bracketedIp[2];
    return isIP(bracketedIp[1]!) === 6 && (!port || (Number(port) > 0 && Number(port) <= 65_535));
  }
  if (isIP(host) > 0) {
    return true;
  }
  const hostWithPort = /^([^:]+):(\d+)$/u.exec(host);
  const hostname = hostWithPort?.[1] ?? host;
  const port = hostWithPort?.[2];
  return (
    (!port || (Number(port) > 0 && Number(port) <= 65_535)) &&
    hostname.length <= 253 &&
    hostname
      .split('.')
      .every(
        (label) =>
          label.length > 0 &&
          label.length <= 63 &&
          /^[A-Za-z\d](?:[A-Za-z\d-]*[A-Za-z\d])?$/u.test(label),
      )
  );
}

/**
 * Validate execution settings shared by check, push, and local simulation.
 *
 * @param config - Environment and network settings
 */
export function validateCustomFunctionExecutionContext(config: {
  /** User-defined environment variables. */
  env?: Record<string, string>;
  /** Native network destinations. */
  allowedHosts?: string[];
}): void {
  const environment = config.env ?? {};
  const envNames = Object.keys(environment);
  const malformedEnvNames = envNames.filter((name) => !/^[A-Za-z][A-Za-z\d_]*$/u.test(name));
  const reservedEnvNames = envNames.filter(
    (name) => RESERVED_ENV_NAMES.has(name) || name.startsWith('DENO_'),
  );
  if (malformedEnvNames.length > 0 || reservedEnvNames.length > 0) {
    throw new Error(
      [
        malformedEnvNames.length > 0
          ? `Invalid environment variable names: ${malformedEnvNames.join(', ')}`
          : undefined,
        reservedEnvNames.length > 0
          ? `Reserved environment variable names: ${reservedEnvNames.join(', ')}`
          : undefined,
      ]
        .filter(Boolean)
        .join('. '),
    );
  }
  const oversizedEnvNames = envNames.filter(
    (name) => Buffer.byteLength(environment[name]!) > CUSTOM_FUNCTION_MAX_ENV_VALUE_BYTES,
  );
  if (oversizedEnvNames.length > 0) {
    throw new Error(
      `Environment values exceed ${CUSTOM_FUNCTION_MAX_ENV_VALUE_BYTES} bytes: ${oversizedEnvNames.join(', ')}`,
    );
  }
  const allowedHosts = config.allowedHosts ?? [];
  if (allowedHosts.length > 1 && allowedHosts.includes('*')) {
    throw new Error('allowed-hosts cannot combine "*" with specific hosts.');
  }
  const invalidHosts = allowedHosts.filter((host) => host !== '*' && !isValidAllowedHost(host));
  if (invalidHosts.length > 0) {
    throw new Error(`Invalid allowed-hosts: ${invalidHosts.join(', ')}`);
  }
}
