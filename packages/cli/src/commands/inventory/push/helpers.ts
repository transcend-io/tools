import {
  normalizeTranscendInput,
  TR_YML_RESOURCE_TO_FIELD_NAME,
  type TranscendInput,
  type TranscendPullResource,
} from '@transcend-io/sdk';

/**
 * Keep only the named top-level sections of a parsed transcend.yml.
 *
 * The legacy `enrichers` section counts as `preflights`, which matches how push reads the file.
 *
 * @param input - Parsed transcend.yml contents
 * @param resources - Resource names, the same names `inventory pull --resources` accepts
 * @returns The input with every other section removed
 * @throws When a named resource has no section in the input
 */
export function filterToResources(
  input: TranscendInput,
  resources: TranscendPullResource[],
): TranscendInput {
  const normalized = normalizeTranscendInput(input);
  const keep = new Set<string>();
  const missing: string[] = [];

  resources.forEach((resource) => {
    const key = TR_YML_RESOURCE_TO_FIELD_NAME[resource];
    if (normalized[key] === undefined) {
      missing.push(resource);
      return;
    }
    keep.add(key);
  });

  if (missing.length > 0) {
    throw new Error(
      `--resources named ${missing.join(', ')}, but the file has no matching section. ` +
        'Add the section to the file or remove the name from --resources.',
    );
  }

  return Object.fromEntries(
    Object.entries(normalized).filter(([key]) => keep.has(key)),
  ) as TranscendInput;
}
