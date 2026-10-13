import { ErrorCode, ToolError } from '@transcend-io/mcp-server-base';

import type { CustomFunctionSummary } from '../graphql.js';

/**
 * Whether the upsert touches versioned fields (code, env, hosts, timeout).
 *
 * @param input - Upsert fields
 * @returns True when a new draft would be written
 */
function touchesVersionFields(input: {
  /** New code */
  code?: string;
  /** Env rows */
  environmentVariables?: unknown[];
  /** Env keys to remove */
  removeEnvironmentVariables?: string[];
  /** Host allowlist */
  allowedHosts?: string[];
  /** Third-party imports */
  allowThirdPartyImports?: boolean;
  /** Timeout */
  timeoutMs?: number;
}): boolean {
  return (
    input.code !== undefined ||
    input.environmentVariables !== undefined ||
    input.removeEnvironmentVariables !== undefined ||
    input.allowedHosts !== undefined ||
    input.allowThirdPartyImports !== undefined ||
    input.timeoutMs !== undefined
  );
}

/**
 * Reject upsert calls that only pass metadata with no version fields.
 *
 * @param input - Upsert fields on update
 * @returns True when name and/or description are the only provided changes
 */
export function isMetadataOnlyUpdate(input: {
  /** Existing function ID */
  id?: string;
  /** New code */
  code?: string;
  /** Env rows */
  environmentVariables?: unknown[];
  /** Env keys to remove */
  removeEnvironmentVariables?: string[];
  /** Host allowlist */
  allowedHosts?: string[];
  /** Third-party imports */
  allowThirdPartyImports?: boolean;
  /** Timeout */
  timeoutMs?: number;
  /** New name */
  name?: string;
  /** New description */
  description?: string;
}): boolean {
  if (!input.id) {
    return false;
  }
  if (touchesVersionFields(input)) {
    return false;
  }
  return input.name !== undefined || input.description !== undefined;
}

/**
 * Whether the caller passed any upsert field on update besides id alone.
 *
 * @param input - Upsert fields on update
 * @returns True when at least one mutable field is set
 */
export function hasAnyUpsertFieldOnUpdate(input: {
  /** New code */
  code?: string;
  /** Env rows */
  environmentVariables?: unknown[];
  /** Env keys to remove */
  removeEnvironmentVariables?: string[];
  /** Host allowlist */
  allowedHosts?: string[];
  /** Third-party imports */
  allowThirdPartyImports?: boolean;
  /** Timeout */
  timeoutMs?: number;
  /** New name */
  name?: string;
  /** New description */
  description?: string;
}): boolean {
  return touchesVersionFields(input) || input.name !== undefined || input.description !== undefined;
}

/**
 * Validate explicit versionId for upsert (draft-only edits).
 *
 * @param summary - Stored custom function
 * @param versionId - Caller-provided draft version ID
 */
export function assertUpsertVersionIdEditable(
  summary: CustomFunctionSummary,
  versionId: string,
): void {
  const draftId = summary.draftVersion?.id;
  const activeId = summary.activeVersion?.id;
  if (activeId === versionId) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      'Cannot edit the active version in place. Omit versionId to continue the pending draft ' +
        '(or start a new draft from active). Use custom_functions_get_code with versionId to read ' +
        'older versions.',
      false,
    );
  }
  if (!summary.hasPendingDraft || !draftId) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      `versionId ${versionId} is not editable. Omit versionId to start a new draft from the ` +
        'active version.',
      false,
    );
  }
  if (versionId !== draftId) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      `versionId must be the pending draft ${draftId}, not ${versionId}. Omit versionId to ` +
        'continue the draft.',
      false,
      { draftVersionId: draftId },
    );
  }
}

/**
 * Resolve versionId passed to updateStandaloneCustomFunction.
 *
 * @param summary - Stored custom function
 * @param versionId - Caller-provided version ID, if any
 * @param sombraChange - Whether the upsert changes the execution gateway
 * @returns Draft version ID to update, or undefined to create a new draft
 */
export function resolveUpsertVersionId(
  summary: CustomFunctionSummary,
  versionId: string | undefined,
  sombraChange: boolean,
): string | undefined {
  if (versionId !== undefined) {
    return versionId;
  }
  if (sombraChange) {
    return undefined;
  }
  if (summary.hasPendingDraft && summary.draftVersion) {
    return summary.draftVersion.id;
  }
  return undefined;
}
