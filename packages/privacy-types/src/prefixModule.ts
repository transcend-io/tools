import { valuesOf } from '@transcend-io/type-utils';
import * as either from 'fp-ts/lib/Either.js';
import * as t from 'io-ts';

/** Catalog a prefix module is published in */
export const PrefixModuleCatalog = {
  /** Provided by Transcend */
  Transcend: 'transcend',
  /** Owned by the organization */
  Organization: 'organization',
} as const;

/** Type override */
export type PrefixModuleCatalog = (typeof PrefixModuleCatalog)[keyof typeof PrefixModuleCatalog];

/**
 * Config on a prefix module release. Backend JSON schemas allow only string properties.
 */
export const PrefixModuleConfig = t.record(t.string, t.string);

/** Type override */
export type PrefixModuleConfig = t.TypeOf<typeof PrefixModuleConfig>;

/** Codec for prefix module catalog in yaml and API mappings */
export const PrefixModuleCatalogCodec = valuesOf(PrefixModuleCatalog);

/**
 * Parse the API config JSON string into a flat string map
 *
 * @param configJson - Raw config from GraphQL
 * @param context - Module name for error messages
 * @returns Parsed config
 */
export function parsePrefixModuleConfigFromJson(
  configJson: string,
  context: { moduleName: string },
): PrefixModuleConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(configJson);
  } catch (cause) {
    throw new Error(
      `Prefix module "${context.moduleName}" has invalid config JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  const decoded = PrefixModuleConfig.decode(parsed);
  if (either.isLeft(decoded)) {
    throw new Error(
      `Prefix module "${context.moduleName}" has invalid config: expected a flat map of string values`,
    );
  }
  return decoded.right;
}
