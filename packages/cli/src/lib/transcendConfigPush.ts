import { ScopeName } from '@transcend-io/privacy-types';

import type { TranscendInput } from '../codecs.js';
import { TR_PUSH_RESOURCE_SCOPE_MAP, TR_YML_RESOURCE_TO_FIELD_NAME } from '../constants.js';
import { TranscendPullResource } from '../enums.js';

export interface TranscendConfigResourceDefinition {
  /** YAML top-level key */
  ymlKey: keyof TranscendInput;
  /** Whether tr-pull supports this resource */
  pull: boolean;
  /** Whether tr-push syncs this resource */
  push: boolean;
  /** Scopes required for push */
  scopes: ScopeName[];
}

/** Resources that decode in TranscendInput but are not synced on push today */
const PULL_ONLY_PUSH_RESOURCES = new Set<TranscendPullResource>([
  TranscendPullResource.Assessments,
  TranscendPullResource.AssessmentTemplates,
  TranscendPullResource.SystemDiscovery,
]);

/**
 * Manifest of transcend.yml resources and their pull/push/scopes support
 */
export const TRANSCEND_CONFIG_RESOURCES: Record<
  TranscendPullResource,
  TranscendConfigResourceDefinition
> = Object.fromEntries(
  Object.values(TranscendPullResource).map((resource) => [
    resource,
    {
      ymlKey: TR_YML_RESOURCE_TO_FIELD_NAME[resource],
      pull: true,
      push: !PULL_ONLY_PUSH_RESOURCES.has(resource),
      scopes: TR_PUSH_RESOURCE_SCOPE_MAP[resource],
    },
  ]),
) as Record<TranscendPullResource, TranscendConfigResourceDefinition>;

/**
 * Whether a transcend.yml section value is non-empty and should count as present
 *
 * @param value - Section value from decoded YAML
 * @returns True when the section should be treated as configured
 */
export function hasTranscendConfigSection(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  return true;
}

/**
 * Remove empty transcend.yml sections from a decoded config object
 *
 * @param config - Decoded transcend.yml object
 * @returns Config with empty sections removed
 */
export function stripEmptyTranscendConfigSections(
  config: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => hasTranscendConfigSection(value)),
  );
}

/**
 * Derive API key scopes required to push a transcend.yml config
 *
 * @param input - Decoded transcend input
 * @param options - Options
 * @returns Unique scope names required for push
 */
export function derivePushScopesFromTranscendInput(
  input: TranscendInput,
  options: {
    /** Expand scope dependencies using TRANSCEND_SCOPES graph */
    expandDependencies?: boolean;
  } = {},
): ScopeName[] {
  const stripped = stripEmptyTranscendConfigSections(input as Record<string, unknown>);
  const scopeSet = new Set<ScopeName>();

  for (const resource of Object.values(TranscendPullResource)) {
    const definition = TRANSCEND_CONFIG_RESOURCES[resource];
    if (!definition.push) {
      continue;
    }
    if (!hasTranscendConfigSection(stripped[definition.ymlKey])) {
      continue;
    }
    definition.scopes.forEach((scope) => scopeSet.add(scope));
  }

  if (options.expandDependencies) {
    // Dependency expansion can be added when RPC needs flattened scope graphs.
  }

  return [...scopeSet];
}

/**
 * Summarize which transcend.yml sections are included in a push
 *
 * @param input - Decoded transcend input
 * @returns Human-readable summary of present sections
 */
export function summarizeTranscendConfigSections(input: TranscendInput): string {
  return Object.entries(input)
    .filter(([, value]) => hasTranscendConfigSection(value))
    .map(([key, value]) => `${key}: (${Array.isArray(value) ? value.length : 1})`)
    .join(', ');
}
