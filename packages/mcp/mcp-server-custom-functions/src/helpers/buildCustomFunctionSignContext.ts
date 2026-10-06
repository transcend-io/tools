import type { CustomFunctionCodeContext } from '@transcend-io/mcp-server-base';

import {
  storedContextUsesSplitEnv,
  type StoredContextJwtPayload,
} from './decodeStoredContextJwt.js';
import { inferSecretFromKeyName } from './inferSecretFromKeyName.js';
import { unsetEnvPlaceholder } from './redactEnv.js';

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
 * Explicit env input from `custom_functions_upsert`.
 */
export interface CustomFunctionEnvironmentVariableInput {
  /** Variable name */
  key: string;
  /** Plaintext value; omit on update to keep the stored value */
  value?: string;
  /** When true, encrypt at sign time */
  isSecret: boolean;
  /** When true on update, replace a stored secret instead of merge-keeping ciphertext */
  replaceSecret?: boolean;
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
    return true;
  }
  return compareSemverAtLeast(version.trim(), MIN_SOMBRA_VERSION_CUSTOM_FUNCTION_SPLIT_ENV);
}

/**
 * Build env rows from an unwrapped context plus optional stored JWT classification.
 *
 * @param context - Unwrapped context from customer ingress
 * @param storedContext - Decoded stored context JWT, when updating
 * @returns Editor-style env rows
 */
export function envEntriesFromUnwrappedContext(
  context: UnwrappedCustomFunctionContext,
  storedContext?: StoredContextJwtPayload | null,
): CustomFunctionEnvEntry[] {
  const mergedValues = context.userDefinedEnv ?? {};
  const hasSplitUnwrap = context.secretEnv !== undefined || context.plaintextEnv !== undefined;

  if (hasSplitUnwrap) {
    const secretEnv = context.secretEnv ?? {};
    const plaintextEnv = context.plaintextEnv ?? {};
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

  if (storedContext && storedContextUsesSplitEnv(storedContext)) {
    const secretKeys = new Set(Object.keys(storedContext.userDefinedEncryptedEnv ?? {}));
    const plainFromJwt = storedContext.userDefinedPlaintextEnv ?? {};
    const keys = new Set([
      ...Object.keys(storedContext.userDefinedEncryptedEnv ?? {}),
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

  const legacyEnv = mergedValues;
  return Object.keys(legacyEnv)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => ({
      key,
      value: legacyEnv[key] ?? '',
      isSecret: inferSecretFromKeyName(key),
    }));
}

/**
 * Ensure declared env names exist as placeholders without dropping stored rows.
 *
 * @param entries - Existing env rows
 * @param envVarNames - Names the agent asked to add
 * @returns Updated env rows
 */
export function applyEnvVarNames(
  entries: CustomFunctionEnvEntry[],
  envVarNames?: string[],
): CustomFunctionEnvEntry[] {
  const byKey = new Map(entries.map((entry) => [entry.key, entry]));
  for (const name of envVarNames ?? []) {
    const key = name.trim();
    if (key === '' || byKey.has(key)) {
      continue;
    }
    const isSecret = inferSecretFromKeyName(key);
    byKey.set(key, {
      key,
      value: unsetEnvPlaceholder(key),
      isSecret,
    });
  }
  return [...byKey.values()].sort((left, right) => left.key.localeCompare(right.key));
}

/**
 * Apply explicit environment variable input from the MCP tool schema.
 *
 * @param entries - Existing env rows
 * @param environmentVariables - Caller-provided classification and optional values
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
      } else if (row.isSecret) {
        value = unsetEnvPlaceholder(key);
      } else {
        value = unsetEnvPlaceholder(key);
      }
    }
    if (
      row.isSecret &&
      prior?.isSecret &&
      value === '' &&
      !row.replaceSecret &&
      prior.value !== ''
    ) {
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
 * Build the runtime context object for Sombra `/v1/custom/sign`.
 *
 * @param options - Env rows and shared context fields
 * @returns Context accepted by customer ingress signing
 */
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
    return true;
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
