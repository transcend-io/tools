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
  'compliance-report':
    'Use plural compliance-reports (demo seeds historically used singular compliance-report).',
};

const TRANSCEND_YML_KEYS = new Set<string>(
  Object.values(TR_YML_RESOURCE_TO_FIELD_NAME) as string[],
);

/** Singular → plural aliases accepted on push (migrated before decode) */
const TOP_LEVEL_KEY_ALIASES: Record<string, keyof TranscendInput> = {
  'compliance-report': 'compliance-reports',
};

export interface PushValidationResult {
  /** Whether the config is valid for push */
  valid: boolean;
  /** io-ts decode errors with paths */
  decodeErrors: string[];
  /** Top-level keys that failed decode */
  unsupportedKeys: string[];
  /** Decoded keys with no push handler (will be ignored on push) */
  noopKeys: string[];
  /** Non-fatal warnings (e.g. unsupported fields that were stripped) */
  warnings: string[];
  /** Config after alias migration / locale stripping, ready for decodeCodec */
  normalizedConfig?: Record<string, unknown>;
}

const YML_KEY_TO_RESOURCE = Object.fromEntries(
  Object.values(TranscendPullResource).map((resource) => [
    TRANSCEND_CONFIG_RESOURCES[resource].ymlKey,
    resource,
  ]),
) as Record<string, TranscendPullResource>;

/**
 * Migrate known singular/legacy top-level keys and strip unsupported fields.
 *
 * - `compliance-report` → `compliance-reports`
 * - `locale` on compliance report entries is stripped with a warning
 *   (CreateComplianceReportInput has no locale; export language = Admin user locale)
 *
 * @param config - Raw YAML object
 * @returns Normalized config and warnings
 */
export function normalizeTranscendInputForPush(config: unknown): {
  /** Normalized config object */
  config: Record<string, unknown>;
  /** Non-fatal warnings */
  warnings: string[];
} {
  const warnings: string[] = [];
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { config: {}, warnings };
  }

  const raw = { ...(config as Record<string, unknown>) };

  for (const [alias, canonical] of Object.entries(TOP_LEVEL_KEY_ALIASES)) {
    if (alias in raw) {
      if (!(canonical in raw) || !hasTranscendConfigSection(raw[canonical as string])) {
        raw[canonical as string] = raw[alias];
        warnings.push(
          `Migrated top-level key "${alias}" → "${canonical}". Update your YAML to use the plural key.`,
        );
      } else {
        warnings.push(
          `Ignoring singular key "${alias}" because "${canonical}" is already present.`,
        );
      }
      delete raw[alias];
    }
  }

  const reports = raw['compliance-reports'];
  if (Array.isArray(reports)) {
    raw['compliance-reports'] = reports.map((report, index) => {
      if (!report || typeof report !== 'object' || Array.isArray(report)) {
        return report;
      }
      const entry = { ...(report as Record<string, unknown>) };
      if ('locale' in entry) {
        warnings.push(
          `compliance-reports[${index}].locale is not supported on CreateComplianceReportInput ` +
            `and was ignored. Italian (or other) export language follows the Admin user's locale, ` +
            `not transcend.yml.`,
        );
        delete entry.locale;
      }
      return entry;
    });
  }

  return { config: raw, warnings };
}

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
  const { config: normalizedConfig, warnings } = normalizeTranscendInputForPush(config);

  try {
    decodeCodec(TranscendInput, normalizedConfig);
  } catch (err) {
    decodeErrors.push((err as Error).message);
    return {
      valid: false,
      decodeErrors,
      unsupportedKeys: [],
      noopKeys: [],
      warnings,
      normalizedConfig,
    };
  }

  const stripped = stripEmptyTranscendConfigSections(normalizedConfig);
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
    warnings,
    normalizedConfig,
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
