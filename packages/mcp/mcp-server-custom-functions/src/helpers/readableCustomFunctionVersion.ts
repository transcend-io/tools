import type { UnwrappedCustomFunctionContext } from './buildCustomFunctionSignContext.js';
import {
  decodeStoredContextJwt,
  envKeyNamesFromStoredContext,
  storedContextUsesSplitEnv,
  type StoredContextJwtPayload,
} from './decodeStoredContextJwt.js';
import { inferSecretFromKeyName } from './inferSecretFromKeyName.js';
import { unsetEnvPlaceholder } from './redactEnv.js';

/** Runtime settings stored in the signed context JWT. */
export interface CustomFunctionReadableSettings {
  /** Outbound hostname allowlist */
  allowedHosts: string[];
  /** Whether third-party imports are allowed */
  allowThirdPartyImports?: boolean;
  /** Execution timeout in milliseconds */
  timeoutMs?: number;
}

/** One environment variable row returned to MCP callers. */
export interface CustomFunctionReadableEnvironmentVariable {
  /** Variable name */
  key: string;
  /** When true, the value is set in the dashboard as a secret */
  isSecret: boolean;
  /** When false, the user still needs to fill the dashboard value */
  isSet: boolean;
  /** Plaintext value when `isSecret` is false and the variable is set */
  value?: string;
}

/** Readable runtime context for a custom function version. */
export interface CustomFunctionReadableVersionContext {
  /** Network and timeout settings */
  settings: CustomFunctionReadableSettings;
  /** Environment variables declared on this version */
  environmentVariables: CustomFunctionReadableEnvironmentVariable[];
}

/**
 * Build agent-safe readable context from a version's signed context JWT and unwrap.
 *
 * Settings and classification come from the JWT payload. Unwrap is used only for
 * plaintext values and whether secrets are still placeholders — never echoed for secrets.
 *
 * @param signedCodeContextJwt - Signed context JWT for the version
 * @param unwrappedContext - Unwrapped context from customer ingress (for code path and isSet)
 * @returns Settings and environment variable rows safe to return to agents
 */
export function buildReadableVersionContext(
  signedCodeContextJwt: string,
  unwrappedContext: UnwrappedCustomFunctionContext,
): CustomFunctionReadableVersionContext {
  const payload = decodeStoredContextJwt(signedCodeContextJwt);
  const settings: CustomFunctionReadableSettings = {
    allowedHosts: payload?.allowedHosts ?? unwrappedContext.allowedHosts ?? [],
    allowThirdPartyImports:
      payload?.allowThirdPartyImports ?? unwrappedContext.allowThirdPartyImports,
    timeoutMs: payload?.timeoutMs ?? unwrappedContext.timeoutMs,
  };

  if (payload && storedContextUsesSplitEnv(payload)) {
    return {
      settings,
      environmentVariables: environmentVariablesFromSplitPayload(payload, unwrappedContext),
    };
  }

  return {
    settings,
    environmentVariables: environmentVariablesFromLegacyContext(unwrappedContext),
  };
}

/**
 * Names of environment variables that still need dashboard values.
 *
 * @param environmentVariables - Readable env rows
 * @returns Keys that are unset
 */
export function unsetEnvironmentVariableKeys(
  environmentVariables: CustomFunctionReadableEnvironmentVariable[],
): string[] {
  return environmentVariables.filter((row) => !row.isSet).map((row) => row.key);
}

function environmentVariablesFromSplitPayload(
  payload: StoredContextJwtPayload,
  unwrappedContext: UnwrappedCustomFunctionContext,
): CustomFunctionReadableEnvironmentVariable[] {
  const secretKeys = Object.keys(payload.userDefinedEncryptedEnv ?? {});
  const plainFromJwt = payload.userDefinedPlaintextEnv ?? {};
  const keys = envKeyNamesFromStoredContext(payload);
  const mergedUnwrap = {
    ...(unwrappedContext.secretEnv ?? {}),
    ...(unwrappedContext.plaintextEnv ?? {}),
    ...(unwrappedContext.userDefinedEnv ?? {}),
  };

  return keys.map((key) => {
    const isSecret = secretKeys.includes(key);
    if (isSecret) {
      const unwrapValue = mergedUnwrap[key];
      const isSet =
        unwrapValue !== undefined && unwrapValue !== '' && unwrapValue !== unsetEnvPlaceholder(key);
      return { key, isSecret: true, isSet };
    }
    const jwtPlain = plainFromJwt[key];
    const unwrapPlain = unwrappedContext.plaintextEnv?.[key] ?? mergedUnwrap[key];
    const value = jwtPlain ?? unwrapPlain;
    const isSet = value !== undefined && value !== '' && value !== unsetEnvPlaceholder(key);
    return {
      key,
      isSecret: false,
      isSet,
      ...(isSet ? { value } : {}),
    };
  });
}

function environmentVariablesFromLegacyContext(
  unwrappedContext: UnwrappedCustomFunctionContext,
): CustomFunctionReadableEnvironmentVariable[] {
  const merged = unwrappedContext.userDefinedEnv ?? {};
  return Object.keys(merged)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => {
      const value = merged[key] ?? '';
      const isSecret = inferSecretFromKeyName(key);
      const isSet = value !== '' && value !== unsetEnvPlaceholder(key);
      if (isSecret) {
        return { key, isSecret: true, isSet };
      }
      return {
        key,
        isSecret: false,
        isSet,
        ...(isSet ? { value } : {}),
      };
    });
}
