import { decodeCodec, getEntries } from '@transcend-io/type-utils';

import { TranscendInput } from '../codecs.js';
import { TR_YML_RESOURCE_TO_FIELD_NAME } from '../constants.js';
import { TranscendPullResource } from '../enums.js';
import {
  hasTranscendConfigSection,
  stripEmptyTranscendConfigSections,
  TRANSCEND_CONFIG_RESOURCES,
} from './transcendConfigPush.js';

/** Hints for common agent mistakes in transcend.yml top-level keys */
export const TRANSCEND_CONFIG_KEY_HINTS: Record<string, string> = {
  'preference-topics':
    'Nest preference topics under purposes[].preference-topics. Define option values at the top level via preference-options.',
  'consent-workflows':
    'Use consent-workflow-triggers for consent automation triggers. Use workflow-configs for DSR workflow settings.',
  'regional-experiences': 'Configure regional experiences under consent-manager.experiences.',
  'compliance-report': 'compliance-report is not supported in transcend.yml push.',
};

const TRANSCEND_YML_KEYS = new Set<string>(
  Object.values(TR_YML_RESOURCE_TO_FIELD_NAME) as string[],
);

export interface PushValidationResult {
  /** Whether the config is valid for push */
  valid: boolean;
  /** io-ts decode errors with paths */
  decodeErrors: string[];
  /** Top-level keys that failed decode */
  unsupportedKeys: string[];
  /** Decoded keys with no push handler (will be ignored on push) */
  noopKeys: string[];
}

const YML_KEY_TO_RESOURCE = Object.fromEntries(
  Object.values(TranscendPullResource).map((resource) => [
    TRANSCEND_CONFIG_RESOURCES[resource].ymlKey,
    resource,
  ]),
) as Record<string, TranscendPullResource>;

/**
 * Validate transcend.yml config before push
 *
 * @param config - Raw decoded YAML object
 * @param options - Options
 * @returns Validation result
 */
export function validateTranscendInputForPush(
  config: unknown,
  options: {
    /** When true, noop keys make validation fail */
    failOnNoopKeys?: boolean;
  } = {},
): PushValidationResult {
  const decodeErrors: string[] = [];

  try {
    decodeCodec(TranscendInput, config);
  } catch (err) {
    decodeErrors.push((err as Error).message);
    return {
      valid: false,
      decodeErrors,
      unsupportedKeys: [],
      noopKeys: [],
    };
  }

  const stripped = stripEmptyTranscendConfigSections(config as Record<string, unknown>);
  const noopKeys: string[] = [];
  const unsupportedKeys: string[] = [];

  for (const key of Object.keys(stripped)) {
    if (!TRANSCEND_YML_KEYS.has(key)) {
      unsupportedKeys.push(key);
      continue;
    }
    const resource = YML_KEY_TO_RESOURCE[key];
    if (!resource) {
      continue;
    }
    if (!TRANSCEND_CONFIG_RESOURCES[resource].push) {
      noopKeys.push(key);
    }
  }

  const valid =
    decodeErrors.length === 0 &&
    unsupportedKeys.length === 0 &&
    (!options.failOnNoopKeys || noopKeys.length === 0);

  return {
    valid,
    decodeErrors,
    unsupportedKeys,
    noopKeys,
  };
}

/**
 * Format push validation errors for CLI output
 *
 * @param result - Validation result
 * @returns Formatted error message
 */
export function formatPushValidationErrors(result: PushValidationResult): string {
  const parts: string[] = [];
  if (result.decodeErrors.length > 0) {
    parts.push(`Decode errors: ${result.decodeErrors.join('; ')}`);
  }
  if (result.unsupportedKeys.length > 0) {
    const keyMessages = result.unsupportedKeys.map((key) => {
      const hint = TRANSCEND_CONFIG_KEY_HINTS[key];
      return hint ? `${key} (${hint})` : key;
    });
    parts.push(`Unsupported top-level keys: ${keyMessages.join('; ')}`);
  }
  if (result.noopKeys.length > 0) {
    parts.push(`Pull-only keys (ignored on push): ${result.noopKeys.join(', ')}`);
  }
  return parts.join('\n');
}

/**
 * List present non-empty top-level keys in a decoded transcend input
 *
 * @param input - Decoded transcend input
 * @returns Present YAML keys
 */
export function listPresentTranscendConfigKeys(input: TranscendInput): (keyof TranscendInput)[] {
  return getEntries(input)
    .filter(([, value]) => hasTranscendConfigSection(value))
    .map(([key]) => key);
}
