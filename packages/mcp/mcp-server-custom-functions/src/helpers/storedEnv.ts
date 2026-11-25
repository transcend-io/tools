import type {
  CustomFunctionEnvEntry,
  UnwrappedCustomFunctionContext,
} from './buildCustomFunctionSignContext.js';
import type { StoredContextJwtPayload } from './decodeStoredContextJwt.js';

/**
 * Placeholder for a new env key so Sombra merge-on-sign retains the slot.
 *
 * @param name - Environment variable name
 * @returns Placeholder value for signing
 */
export function unsetEnvPlaceholder(name: string): string {
  return `\${${name}}`;
}

/**
 * Whether an env value is considered set (not empty and not the unset placeholder).
 *
 * @param key - Environment variable name
 * @param value - Unwrapped or stored value
 * @returns True when the user has filled the value
 */
export function isEnvValueSet(key: string, value: string | undefined): boolean {
  return value !== undefined && value !== '' && value !== unsetEnvPlaceholder(key);
}

/**
 * Classify stored environment variables from JWT payload and unwrap (no name heuristics).
 *
 * @param storedPayload - Decoded context JWT, when available
 * @param unwrapped - Unwrapped context from customer ingress
 * @returns Env rows with secret/plain classification from storage only
 */
export function classifyStoredEnv(
  storedPayload: StoredContextJwtPayload | null | undefined,
  unwrapped: UnwrappedCustomFunctionContext,
): CustomFunctionEnvEntry[] {
  const mergedValues = unwrapped.userDefinedEnv ?? {};
  const hasSplitUnwrap = unwrapped.secretEnv !== undefined || unwrapped.plaintextEnv !== undefined;

  if (hasSplitUnwrap) {
    const secretEnv = unwrapped.secretEnv ?? {};
    const plaintextEnv = unwrapped.plaintextEnv ?? {};
    const keys = new Set([...Object.keys(secretEnv), ...Object.keys(plaintextEnv)]);
    return [...keys]
      .sort((left, right) => left.localeCompare(right))
      .map((key) => {
        if (key in secretEnv) {
          return { key, value: secretEnv[key] ?? '', isSecret: true };
        }
        return {
          key,
          value: plaintextEnv[key] ?? '',
          isSecret: false,
        };
      });
  }

  if (storedPayload && storedPayload.userDefinedPlaintextEnv !== undefined) {
    const secretKeys = new Set(Object.keys(storedPayload.userDefinedEncryptedEnv ?? {}));
    const plainFromJwt = storedPayload.userDefinedPlaintextEnv ?? {};
    const keys = new Set([
      ...Object.keys(storedPayload.userDefinedEncryptedEnv ?? {}),
      ...Object.keys(plainFromJwt),
      ...Object.keys(mergedValues),
    ]);
    return [...keys]
      .sort((left, right) => left.localeCompare(right))
      .map((key) => {
        const isSecret = secretKeys.has(key);
        const value = isSecret
          ? (mergedValues[key] ?? '')
          : (mergedValues[key] ?? plainFromJwt[key] ?? '');
        return { key, value, isSecret };
      });
  }

  const legacyKeys = new Set(Object.keys(mergedValues));
  if (storedPayload) {
    for (const key of Object.keys(storedPayload.userDefinedEncryptedEnv ?? {})) {
      legacyKeys.add(key);
    }
    for (const key of Object.keys(storedPayload.userDefinedPlaintextEnv ?? {})) {
      legacyKeys.add(key);
    }
  }
  return [...legacyKeys]
    .sort((left, right) => left.localeCompare(right))
    .map((key) => ({
      key,
      value: mergedValues[key] ?? '',
      isSecret: true,
    }));
}
