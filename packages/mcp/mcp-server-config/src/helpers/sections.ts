import type { ScopeName } from '@transcend-io/privacy-types';
import {
  TR_YML_RESOURCE_TO_FIELD_NAME,
  TranscendPullResource,
  type TranscendInput,
} from '@transcend-io/sdk/transcend-yml';

/** Whether a top-level `transcend.yml` section has anything to sync. */
export function hasConfigSection(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

/**
 * Drop empty sections. An empty array such as `action-items: []` still counts as
 * a present key, and would request scopes and sync attempts for nothing.
 */
export function stripEmptyConfigSections(input: TranscendInput): TranscendInput {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => hasConfigSection(value)),
  ) as TranscendInput;
}

/** Item count per non-empty section, so a tool result never has to echo the file. */
export function countConfigSections(input: TranscendInput): Record<string, number> {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => hasConfigSection(value))
      .map(([key, value]) => [
        key,
        Array.isArray(value) ? value.length : Object.keys(value as object).length || 1,
      ]),
  );
}

/** Resources whose section is present in the input. */
export function resourcesInInput(input: TranscendInput): TranscendPullResource[] {
  return Object.values(TranscendPullResource).filter((resource) =>
    hasConfigSection(input[TR_YML_RESOURCE_TO_FIELD_NAME[resource]]),
  );
}

/** Union of the scopes for the given resources, from a scope map. */
export function scopesForResources(
  resources: readonly TranscendPullResource[],
  scopeMap: Record<TranscendPullResource, ScopeName[]>,
): ScopeName[] {
  return [...new Set(resources.flatMap((resource) => scopeMap[resource]))].sort();
}
