import type { UnwrappedCustomFunctionContext } from './buildCustomFunctionSignContext.js';
import { decodeStoredContextJwt } from './decodeStoredContextJwt.js';
import { classifyStoredEnv, isEnvValueSet } from './storedEnv.js';

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

  const entries = classifyStoredEnv(payload, unwrappedContext);
  const environmentVariables: CustomFunctionReadableEnvironmentVariable[] = entries.map((entry) => {
    const isSet = isEnvValueSet(entry.key, entry.value);
    if (entry.isSecret) {
      return { key: entry.key, isSecret: true, isSet };
    }
    return {
      key: entry.key,
      isSecret: false,
      isSet,
      ...(isSet ? { value: entry.value } : {}),
    };
  });

  return { settings, environmentVariables };
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
