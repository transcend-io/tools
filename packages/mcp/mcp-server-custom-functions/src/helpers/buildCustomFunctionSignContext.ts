import {
  ErrorCode,
  ToolError,
  type CustomFunctionCodeContext,
} from '@transcend-io/mcp-server-base';

import type { StoredContextJwtPayload } from './decodeStoredContextJwt.js';
import type { CustomFunctionEnvironmentVariableInput } from './environmentVariableInput.js';
import { unsetEnvPlaceholder } from './storedEnv.js';

/** Minimum Sombra version that persists split `secretEnv` / `plaintextEnv` maps. */
export const MIN_SOMBRA_VERSION_CUSTOM_FUNCTION_SPLIT_ENV = '7.609.0';

/**
 * One environment variable row used while building a sign context.
 */
export interface CustomFunctionEnvEntry {
  /** Variable name */
  key: string;
  /** Plaintext value to sign (may be a dashboard placeholder) */
  value: string;
  /** When true, the value is encrypted into `userDefinedEncryptedEnv` */
  isSecret: boolean;
}

/**
 * Unwrapped execution context from Sombra customer ingress.
 */
export interface UnwrappedCustomFunctionContext {
  /** Legacy merged env map */
  userDefinedEnv?: Record<string, string>;
  /** Split-map secrets from unwrap */
  secretEnv?: Record<string, string>;
  /** Split-map plaintext from unwrap */
  plaintextEnv?: Record<string, string>;
  /** Network allowlist */
  allowedHosts: string[];
  /** Whether third-party imports are allowed */
  allowThirdPartyImports?: boolean;
  /** Execution timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * Whether the target Sombra gateway supports split secret/plain env signing.
 *
 * @param version - Primary Sombra semver string from GraphQL, when known
 * @returns True when split maps should be sent to `/v1/custom/sign`
 */
export function sombraSupportsCustomFunctionSplitEnv(version: string | undefined): boolean {
  if (!version?.trim()) {
    return false;
  }
  return compareSemverAtLeast(version.trim(), MIN_SOMBRA_VERSION_CUSTOM_FUNCTION_SPLIT_ENV);
}

/**
 * Apply environment variable input from `custom_functions_upsert`.
 *
 * @param entries - Existing env rows
 * @param environmentVariables - Caller-provided classification and optional plain values
 * @returns Updated env rows
 */
export function applyEnvironmentVariablesInput(
  entries: CustomFunctionEnvEntry[],
  environmentVariables?: CustomFunctionEnvironmentVariableInput[],
): CustomFunctionEnvEntry[] {
  if (!environmentVariables || environmentVariables.length === 0) {
    return entries;
  }
  const byKey = new Map(entries.map((entry) => [entry.key, { ...entry }]));
  for (const row of environmentVariables) {
    const key = row.key.trim();
    if (key === '') {
      continue;
    }
    const prior = byKey.get(key);
    let value = row.value;
    if (value === undefined) {
      if (prior) {
        value = prior.value;
      } else {
        value = unsetEnvPlaceholder(key);
      }
    }
    if (row.isSecret && prior?.isSecret && value === '' && prior.value !== '') {
      value = prior.value;
    }
    byKey.set(key, {
      key,
      value,
      isSecret: row.isSecret,
    });
  }
  return [...byKey.values()].sort((left, right) => left.key.localeCompare(right.key));
}

/**
 * Remove environment variable keys from editor rows before signing.
 *
 * @param entries - Existing env rows
 * @param keysToRemove - Keys to drop entirely
 * @returns Env rows without the removed keys
 */
export function removeEnvironmentVariableKeys(
  entries: CustomFunctionEnvEntry[],
  keysToRemove?: string[],
): CustomFunctionEnvEntry[] {
  if (!keysToRemove?.length) {
    return entries;
  }
  const removeSet = new Set(keysToRemove.map((key) => key.trim()).filter(Boolean));
  if (removeSet.size === 0) {
    return entries;
  }
  return entries.filter((entry) => !removeSet.has(entry.key));
}

/**
 * Keys that flipped from plain to secret in this upsert.
 *
 * @param prior - Existing env rows before merge
 * @param environmentVariables - Incoming env rows from the agent
 * @returns Keys whose classification changed plain → secret
 */
export function plainToSecretFlipKeys(
  prior: CustomFunctionEnvEntry[],
  environmentVariables?: CustomFunctionEnvironmentVariableInput[],
): string[] {
  if (!environmentVariables?.length) {
    return [];
  }
  const priorByKey = new Map(prior.map((entry) => [entry.key, entry]));
  const flipped: string[] = [];
  for (const row of environmentVariables) {
    const key = row.key.trim();
    const priorEntry = priorByKey.get(key);
    if (priorEntry && !priorEntry.isSecret && row.isSecret) {
      flipped.push(key);
    }
  }
  return flipped;
}

/**
 * Reject flipping a stored secret to plaintext via MCP.
 *
 * @param prior - Existing env rows before merge
 * @param environmentVariables - Incoming env rows from the agent
 * @returns Error message when a flip is attempted, otherwise undefined
 */
export function secretToPlainFlipError(
  prior: CustomFunctionEnvEntry[],
  environmentVariables?: CustomFunctionEnvironmentVariableInput[],
): string | undefined {
  if (!environmentVariables?.length) {
    return undefined;
  }
  const priorByKey = new Map(prior.map((entry) => [entry.key, entry]));
  for (const row of environmentVariables) {
    const key = row.key.trim();
    const priorEntry = priorByKey.get(key);
    if (priorEntry?.isSecret && !row.isSecret) {
      return (
        `Cannot change "${key}" from secret to plain text through MCP. ` +
        'Update classification in the Admin Dashboard Environment Variables tab.'
      );
    }
  }
  return undefined;
}

/**
 * Build the runtime context object for Sombra `/v1/custom/sign`.
 *
 * @param options - Env rows and shared context fields
 * @returns Context accepted by customer ingress signing
 */
/**
 * Env var key names present on a sign context about to be sent to Sombra.
 *
 * @param context - Sign context from {@link buildCustomFunctionSignContext}
 * @returns Sorted unique keys
 */
export function envKeysFromSignContext(context: CustomFunctionCodeContext): string[] {
  const hasSplit = context.secretEnv !== undefined || context.plaintextEnv !== undefined;
  if (hasSplit) {
    const keys = new Set([
      ...Object.keys(context.secretEnv ?? {}),
      ...Object.keys(context.plaintextEnv ?? {}),
    ]);
    return [...keys].sort((left, right) => left.localeCompare(right));
  }
  return Object.keys(context.userDefinedEnv).sort((left, right) => left.localeCompare(right));
}

/**
 * Fail before signing when the sign context would drop env keys.
 *
 * @param expectedKeys - Keys that must appear on the sign context
 * @param context - Built sign context
 */
export function assertSignContextPreservesEnvKeys(
  expectedKeys: string[],
  context: CustomFunctionCodeContext,
): void {
  const signedSet = new Set(envKeysFromSignContext(context));
  const missing = expectedKeys.filter((key) => !signedSet.has(key));
  if (missing.length === 0) {
    return;
  }
  throw new ToolError(
    ErrorCode.VALIDATION_ERROR,
    `Signing would drop environment variable keys: ${missing.join(', ')}. Retry with legacy-compatible ` +
      'settings or contact support if the gateway version is unknown.',
    false,
    { missingEnvKeys: missing },
  );
}

export function buildCustomFunctionSignContext(options: {
  /** Env rows after merge / classification */
  envEntries: CustomFunctionEnvEntry[];
  /** Whether the signing Sombra accepts split env maps */
  supportsSplitEnv: boolean;
  /** Hosts the function may contact */
  allowedHosts: string[];
  /** Whether third-party imports are allowed */
  allowThirdPartyImports?: boolean;
  /** Execution timeout in milliseconds */
  timeoutMs?: number;
}): CustomFunctionCodeContext {
  const shared = {
    allowedHosts: options.allowedHosts,
    allowThirdPartyImports: options.allowThirdPartyImports,
    timeoutMs: options.timeoutMs,
  };

  if (!options.supportsSplitEnv) {
    const userDefinedEnv: Record<string, string> = {};
    for (const entry of options.envEntries) {
      const key = entry.key.trim();
      if (key === '') {
        continue;
      }
      userDefinedEnv[key] = entry.value;
    }
    return {
      userDefinedEnv,
      ...shared,
    };
  }

  const secretEnv: Record<string, string> = {};
  const plaintextEnv: Record<string, string> = {};
  for (const entry of options.envEntries) {
    const key = entry.key.trim();
    if (key === '') {
      continue;
    }
    if (entry.isSecret) {
      secretEnv[key] = entry.value;
    } else {
      plaintextEnv[key] = entry.value;
    }
  }

  return {
    userDefinedEnv: {},
    secretEnv,
    plaintextEnv,
    ...shared,
  };
}

/**
 * Compare two semver strings (`major.minor.patch` prefix).
 *
 * @param version - Installed version
 * @param minimum - Required minimum version
 * @returns True when `version` is greater than or equal to `minimum`
 */
function compareSemverAtLeast(version: string, minimum: string): boolean {
  const left = parseSemverTriple(version);
  const right = parseSemverTriple(minimum);
  if (!left || !right) {
    return false;
  }
  if (left[0] !== right[0]) {
    return left[0] > right[0];
  }
  if (left[1] !== right[1]) {
    return left[1] > right[1];
  }
  return left[2] >= right[2];
}

/**
 * Parse the leading `major.minor.patch` from a version string.
 *
 * @param version - Semver string
 * @returns Numeric triple, or undefined when not parseable
 */
function parseSemverTriple(version: string): [number, number, number] | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) {
    return undefined;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}
