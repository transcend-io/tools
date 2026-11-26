import { randomUUID } from 'node:crypto';

import { serializeTranscendYaml, TranscendPullResource } from '@transcend-io/sdk';
import { createCollectingLogger, type SyncResult } from '@transcend-io/utils';

import { containsUnknown, unwrapSecrets, wrapSecrets } from '../engineValues.js';
import type { ConfigDeps } from './deps.js';
import {
  DEFAULT_PAGE_SIZE,
  parseConfigInputs,
  sectionsInInput,
  stripEmptySections,
  validateConfigSource,
  type ConfigInputs,
} from './inputs.js';

/** Properties of the Config resource, as plain JSON the engine can carry. */
type Properties = Record<string, unknown>;

/** Inputs that change what a push writes, so changing one needs a new push. */
const PUSH_OPTION_KEYS = [
  'deleteExtraAttributeValues',
  'publishToPrivacyCenter',
  'classifyService',
] as const;

/** A validation failure reported against one input property. */
export interface ConfigCheckFailure {
  /** Input property that failed */
  property: string;
  /** What is wrong */
  reason: string;
}

/**
 * Validate the inputs of a Config resource.
 *
 * @param news - Inputs from the program
 * @returns Failures to show at preview time. Empty when valid.
 */
export function checkConfig(news: Properties): ConfigCheckFailure[] {
  if (containsUnknown(news)) return [];
  const { values } = unwrapSecrets(news);
  const inputs = values as ConfigInputs;
  const sourceProblem = validateConfigSource(inputs);
  if (sourceProblem) return [{ property: 'yaml', reason: sourceProblem }];
  try {
    parseConfigInputs(inputs);
  } catch (error) {
    return [
      {
        property: inputs.yaml === undefined ? 'content' : 'yaml',
        reason: formatConfigParseFailure(error),
      },
    ];
  }
  return [];
}

/**
 * Decide whether an update is needed. Compares the program with the live
 * organization, so drift made in the Admin Dashboard shows up without a refresh.
 *
 * @param deps - API access
 * @param olds - Inputs from state
 * @param news - Inputs from the program
 * @returns Whether a push would change anything
 */
export async function diffConfig(
  deps: ConfigDeps,
  olds: Properties,
  news: Properties,
): Promise<boolean> {
  if (containsUnknown(news)) return true;
  const oldInputs = unwrapSecrets(olds).values as ConfigInputs;
  const newInputs = unwrapSecrets(news).values as ConfigInputs;
  const optionChanged = PUSH_OPTION_KEYS.some(
    (key) => (oldInputs[key] ?? false) !== (newInputs[key] ?? false),
  );
  const plan = await deps.previewPush(deps.buildClient(), parseConfigInputs(newInputs), {
    pageSize: newInputs.pageSize ?? DEFAULT_PAGE_SIZE,
    deleteExtraAttributeValues: newInputs.deleteExtraAttributeValues ?? false,
  });
  return optionChanged || plan.summary.create + plan.summary.update > 0;
}

function describeSyncFailure(result: SyncResult): string {
  const details = result.errors
    .map((error) =>
      error.item
        ? `${error.resource}/${error.item}: ${error.message}`
        : `${error.resource}: ${error.message}`,
    )
    .join('; ');
  return `Transcend rejected part of the configuration. ${details}`;
}

/** Report parse failures without echoing substituted secret values from YAML snippets. */
function formatConfigParseFailure(error: unknown): string {
  if (error && typeof error === 'object' && 'name' in error) {
    const named = error as {
      name: string;
      reason?: string;
      mark?: { line?: number; column?: number };
    };
    if (named.name === 'YAMLException') {
      const reason = named.reason ?? 'Invalid YAML';
      if (named.mark && typeof named.mark.line === 'number') {
        const column = typeof named.mark.column === 'number' ? named.mark.column + 1 : 1;
        return `${reason} (line ${named.mark.line + 1}, column ${column})`;
      }
      return reason;
    }
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Push the configuration. Used for both create and update because a push is an
 * upsert.
 *
 * @param deps - API access
 * @param news - Inputs from the program
 * @returns Resource outputs
 */
export async function applyConfig(deps: ConfigDeps, news: Properties): Promise<Properties> {
  const { values, secretKeys } = unwrapSecrets(news);
  const inputs = values as ConfigInputs;
  const input = parseConfigInputs(inputs);

  const quiet = { info() {}, warn() {}, error() {}, debug() {} };
  const { logger, logs } = createCollectingLogger({ delegate: quiet });
  const result = await deps.sync(input, deps.buildClient(), {
    pageSize: inputs.pageSize ?? DEFAULT_PAGE_SIZE,
    publishToPrivacyCenter: inputs.publishToPrivacyCenter ?? false,
    classifyService: inputs.classifyService ?? false,
    deleteExtraAttributeValues: inputs.deleteExtraAttributeValues ?? false,
    logger,
  });
  if (!result.success)
    throw new Error(describeSyncFailure({ ...result, logs: result.logs ?? logs }));

  return wrapSecrets(
    { ...values, sections: sectionsInInput(input), warnings: result.warnings ?? [] },
    secretKeys,
  );
}

/** A new id for a Config resource. The id has no meaning in the Transcend API. */
export function newConfigId(): string {
  return randomUUID();
}

/**
 * Parse an import id such as `dataSilos,purposes` into pull resources.
 *
 * @param id - Comma-separated pull resource names
 * @returns Validated resources
 */
export function parseImportId(id: string): TranscendPullResource[] {
  const valid = new Set<string>(Object.values(TranscendPullResource));
  const names = id
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  const unknown = names.filter((name) => !valid.has(name));
  if (names.length === 0 || unknown.length > 0) {
    throw new Error(
      `Import id must be a comma-separated list of sections. Unknown: ${
        unknown.join(', ') || '(none given)'
      }. Valid: ${[...valid].join(', ')}.`,
    );
  }
  return names as TranscendPullResource[];
}

/**
 * Pull sections from the organization and describe them as Config inputs.
 *
 * @param deps - API access
 * @param resources - Sections to read
 * @returns A YAML document plus the sections it holds
 */
export async function pullConfigInputs(
  deps: ConfigDeps,
  resources: TranscendPullResource[],
): Promise<Properties> {
  const config = stripEmptySections(
    await deps.pull(deps.buildClient(), {
      resources,
      dataSiloIds: [],
      integrationNames: [],
      pageSize: DEFAULT_PAGE_SIZE,
      debug: false,
    }),
  );
  return { yaml: serializeTranscendYaml(config), sections: sectionsInInput(config), warnings: [] };
}
