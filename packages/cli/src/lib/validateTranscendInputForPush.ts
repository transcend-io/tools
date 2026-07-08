import { decodeCodec, getEntries } from '@transcend-io/type-utils';

import { TranscendInput } from '../codecs.js';
import { TranscendPullResource } from '../enums.js';
import {
  hasTranscendConfigSection,
  stripEmptyTranscendConfigSections,
  TRANSCEND_CONFIG_RESOURCES,
} from './transcendConfigPush.js';

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
  let decoded: TranscendInput;

  try {
    decoded = decodeCodec(TranscendInput, config);
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

  for (const key of Object.keys(stripped)) {
    const resource = YML_KEY_TO_RESOURCE[key];
    if (!resource) {
      continue;
    }
    if (!TRANSCEND_CONFIG_RESOURCES[resource].push) {
      noopKeys.push(key);
    }
  }

  const valid = decodeErrors.length === 0 && (!options.failOnNoopKeys || noopKeys.length === 0);

  return {
    valid,
    decodeErrors,
    unsupportedKeys: [],
    noopKeys,
  };
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
