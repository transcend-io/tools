import {
  normalizeTranscendInput,
  parseTranscendYaml,
  TR_YML_RESOURCE_TO_FIELD_NAME,
  TranscendInput,
  TranscendPullResource,
} from '@transcend-io/sdk';
import { decodeCodec } from '@transcend-io/type-utils';

/** Inputs of the `transcend:index:Config` resource, as the engine sends them. */
export interface ConfigInputs {
  /** transcend.yml text. Exactly one of `yaml` and `content` is set. */
  yaml?: string;
  /** transcend.yml as an object with the same keys as the file */
  content?: Record<string, unknown>;
  /** Values for `<<parameters.name>>` placeholders in `yaml` */
  variables?: Record<string, string>;
  /** Delete attribute values that the file leaves out */
  deleteExtraAttributeValues?: boolean;
  /** Publish privacy center changes after the push */
  publishToPrivacyCenter?: boolean;
  /** Run service classification on data silos during the push */
  classifyService?: boolean;
  /** Records per API request */
  pageSize?: number;
}

/** Records per API request when the user does not choose. Matches the CLI. */
export const DEFAULT_PAGE_SIZE = 50;

/** The `transcend.yml` keys that hold something to push. */
function hasSection(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

/**
 * Drop empty sections so an empty list does not request scopes or writes.
 *
 * @param input - Parsed configuration
 * @returns The configuration without empty sections
 */
export function stripEmptySections(input: TranscendInput): TranscendInput {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => hasSection(value)),
  ) as TranscendInput;
}

/**
 * Validate that exactly one source of configuration is set.
 *
 * @param inputs - Resource inputs
 * @returns A failure message, or undefined when valid
 */
export function validateConfigSource(inputs: ConfigInputs): string | undefined {
  const hasYaml = inputs.yaml !== undefined;
  const hasContent = inputs.content !== undefined;
  if (hasYaml === hasContent) return 'Set exactly one of `yaml` and `content`.';
  if (hasContent && inputs.variables) {
    return '`variables` only applies to `yaml`. Substitute values in `content` in your program.';
  }
  return undefined;
}

/**
 * Parse and validate the configuration a `Config` resource describes.
 *
 * @param inputs - Resource inputs
 * @returns The validated configuration without empty sections
 */
export function parseConfigInputs(inputs: ConfigInputs): TranscendInput {
  if (inputs.yaml !== undefined) {
    return stripEmptySections(parseTranscendYaml(inputs.yaml, inputs.variables ?? {}));
  }
  return stripEmptySections(
    normalizeTranscendInput(decodeCodec(TranscendInput, inputs.content ?? {})),
  );
}

/**
 * List the pull resources whose sections appear in a configuration.
 *
 * @param input - Parsed configuration
 * @returns Resources with at least one item
 */
export function sectionsInInput(input: TranscendInput): TranscendPullResource[] {
  return Object.values(TranscendPullResource).filter((resource) =>
    hasSection(input[TR_YML_RESOURCE_TO_FIELD_NAME[resource]]),
  );
}
