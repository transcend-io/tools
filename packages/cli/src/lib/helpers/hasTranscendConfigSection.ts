import type { ScopeName } from '@transcend-io/privacy-types';
import { uniq } from 'lodash-es';

import type { TranscendInput } from '../../codecs.js';
import { TR_PUSH_RESOURCE_SCOPE_MAP, TR_YML_RESOURCE_TO_FIELD_NAME } from '../../constants.js';
import { TranscendPullResource } from '../../enums.js';

/**
 * Whether a transcend.yml top-level section should trigger push scopes / sync.
 * Empty arrays like `"processing-activities": []` must not request ManageDataMap.
 *
 * @param value - Top-level YAML section value
 * @returns True when the section has content to sync
 */
export function hasTranscendConfigSection(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }
  return true;
}

/**
 * Remove empty transcend.yml sections before decode / scope derivation.
 * Empty arrays like `"action-items": []` still count as present keys and can
 * cause unnecessary API scopes or sync attempts.
 *
 * @param config - Raw YAML object
 * @returns Config with empty top-level sections removed
 */
export function stripEmptyTranscendConfigSections(
  config: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => hasTranscendConfigSection(value)),
  );
}

/**
 * Derive push scopes only for non-empty config sections.
 *
 * @param input - Decoded transcend.yml input
 * @returns Unique ScopeName values required for the push
 */
export function derivePushScopesFromTranscendInput(input: TranscendInput): ScopeName[] {
  return uniq(
    Object.values(TranscendPullResource).flatMap((resource) =>
      hasTranscendConfigSection(input[TR_YML_RESOURCE_TO_FIELD_NAME[resource]])
        ? TR_PUSH_RESOURCE_SCOPE_MAP[resource]
        : [],
    ),
  );
}

/**
 * Summarize which transcend.yml sections are included in a push.
 *
 * @param input - Decoded transcend.yml input
 * @returns Human-readable section summary
 */
export function summarizeTranscendConfigSections(input: TranscendInput): string {
  return Object.entries(input)
    .filter(([, value]) => hasTranscendConfigSection(value))
    .map(([key, value]) => `${key}: (${Array.isArray(value) ? value.length : 1})`)
    .join(', ');
}
