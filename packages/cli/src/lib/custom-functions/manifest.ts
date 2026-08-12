import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import type { CustomFunctionConfigInput } from '@transcend-io/sdk';
import { decodeCodec, type ObjByString } from '@transcend-io/type-utils';
import * as t from 'io-ts';
import yaml from 'js-yaml';
import { isMap, isScalar, isSeq, parseDocument } from 'yaml';

import { replaceVariablesInYaml } from '../readTranscendYaml.js';

export const CustomFunctionManifestEntry = t.intersection([
  t.type({
    /** Display name of the custom function — used as the sync key when no `id` is set */
    name: t.string,
    /** Path to the TypeScript source file, relative to the manifest */
    code: t.string,
  }),
  t.partial({
    /**
     * Custom function ID. Optional, but required to disambiguate when multiple
     * custom functions share a name. Written back by `push --updateManifest`.
     */
    id: t.string,
    /** Description shown in the Transcend dashboard */
    description: t.string,
    /** Custom function type. Defaults to GENERAL */
    type: t.union([t.literal('DSR'), t.literal('GENERAL')]),
    /** Data silo ID to attach to (required for DSR functions) */
    'data-silo-id': t.string,
    /** The Sombra gateway the function belongs to */
    'sombra-id': t.string,
    /**
     * Name of the environment variable holding the internal key of the
     * function's Sombra gateway. The key itself never lives in the manifest —
     * it is read from the CLI's process environment at push time. Overrides
     * `--sombraAuth` for this entry.
     */
    'sombra-auth-env': t.string,
    /** Hosts the function may make network requests to */
    'allowed-hosts': t.array(t.string),
    /** Execution timeout in milliseconds */
    'timeout-ms': t.number,
    /** Whether the function may import third party modules */
    'allow-third-party-imports': t.boolean,
    /** Environment variables to expose to the function */
    env: t.record(t.string, t.string),
    /**
     * Path to a JSON file (relative to the manifest) holding the test payload
     * to run the function with before pushing. When set, the function is
     * test-run after signing and only pushed/promoted when the test passes.
     */
    'test-payload': t.string,
    /**
     * Which export to invoke when test-running a DSR function:
     * `DATA_POINT` invokes the default export, `REQUEST_ENRICHER` invokes the
     * `enricher` export. Defaults to DATA_POINT. Ignored for GENERAL functions.
     */
    'test-payload-type': t.union([t.literal('DATA_POINT'), t.literal('REQUEST_ENRICHER')]),
  }),
]);

/** Override type */
export type CustomFunctionManifestEntry = t.TypeOf<typeof CustomFunctionManifestEntry>;

export const CustomFunctionsManifest = t.type({
  /** The custom functions to sync */
  functions: t.array(CustomFunctionManifestEntry),
});

/** Override type */
export type CustomFunctionsManifest = t.TypeOf<typeof CustomFunctionsManifest>;

/**
 * Read a custom functions manifest from disk, apply variable substitution,
 * validate its shape, and load each function's source code.
 *
 * @param filePath - Path to the manifest YAML file
 * @param variables - Variables to fill into `<<parameters.x>>` placeholders
 * @returns The custom function configs, with code loaded from disk
 */
/**
 * A custom function config from the manifest, plus CLI-level settings that
 * are not part of the SDK sync input.
 */
export type CustomFunctionManifestConfig = CustomFunctionConfigInput & {
  /** Env variable name holding the internal key of the function's Sombra gateway */
  sombraAuthEnv?: string;
  /** Parsed JSON test payload to run the function with before pushing */
  testPayload?: object;
  /** Which export to invoke when test-running a DSR function */
  testPayloadType?: 'DATA_POINT' | 'REQUEST_ENRICHER';
};

export function readCustomFunctionsManifest(
  filePath: string,
  variables: ObjByString = {},
): CustomFunctionManifestConfig[] {
  const fileContents = readFileSync(filePath, 'utf-8');

  const replacedVariables = replaceVariablesInYaml(
    fileContents,
    variables,
    `Also check that there are no extra variables defined in your manifest: ${filePath}`,
  );

  const manifest = decodeCodec(CustomFunctionsManifest, yaml.load(replacedVariables));

  // IDs must be unique — two entries cannot target the same function
  const duplicateIds = manifest.functions
    .map(({ id }) => id)
    .filter((id, index, ids) => id !== undefined && ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new Error(
      `Duplicate custom function ids in manifest: ${[...new Set(duplicateIds)].join(', ')}`,
    );
  }

  // Names may repeat only when every entry sharing the name carries an `id`
  // to disambiguate; an id-less entry syncs by name and would be ambiguous.
  const allNames = manifest.functions.map(({ name }) => name);
  const ambiguousNames = manifest.functions
    .filter(({ id, name }) => id === undefined && allNames.filter((n) => n === name).length > 1)
    .map(({ name }) => name);
  if (ambiguousNames.length > 0) {
    throw new Error(
      `Duplicate custom function names in manifest without ids: ${[...new Set(ambiguousNames)].join(', ')}. ` +
        'Add an `id` field to each duplicated entry to disambiguate.',
    );
  }

  const manifestDir = dirname(resolve(filePath));
  return manifest.functions.map((entry) => {
    const codePath = resolve(manifestDir, entry.code);
    if (!existsSync(codePath)) {
      throw new Error(`Code file for custom function "${entry.name}" does not exist: ${codePath}`);
    }
    let testPayload: object | undefined;
    if (entry['test-payload'] !== undefined) {
      const testPayloadPath = resolve(manifestDir, entry['test-payload']);
      if (!existsSync(testPayloadPath)) {
        throw new Error(
          `Test payload file for custom function "${entry.name}" does not exist: ${testPayloadPath}`,
        );
      }
      const rawPayload = readFileSync(testPayloadPath, 'utf-8');
      try {
        testPayload = JSON.parse(rawPayload);
      } catch (err) {
        throw new Error(
          `Test payload file for custom function "${entry.name}" is not valid JSON ` +
            `(${testPayloadPath}): ${(err as Error).message}`,
        );
      }
    }
    return {
      name: entry.name,
      code: readFileSync(codePath, 'utf-8'),
      ...(entry.id !== undefined ? { id: entry.id } : {}),
      ...(entry.description !== undefined ? { description: entry.description } : {}),
      ...(entry.type !== undefined ? { type: entry.type } : {}),
      ...(entry['data-silo-id'] !== undefined ? { dataSiloId: entry['data-silo-id'] } : {}),
      ...(entry['sombra-id'] !== undefined ? { sombraId: entry['sombra-id'] } : {}),
      ...(entry['sombra-auth-env'] !== undefined
        ? { sombraAuthEnv: entry['sombra-auth-env'] }
        : {}),
      ...(entry['allowed-hosts'] !== undefined ? { allowedHosts: entry['allowed-hosts'] } : {}),
      ...(entry['timeout-ms'] !== undefined ? { timeoutMs: entry['timeout-ms'] } : {}),
      ...(entry['allow-third-party-imports'] !== undefined
        ? { allowThirdPartyImports: entry['allow-third-party-imports'] }
        : {}),
      ...(entry.env !== undefined ? { env: entry.env } : {}),
      ...(testPayload !== undefined ? { testPayload } : {}),
      ...(entry['test-payload-type'] !== undefined
        ? { testPayloadType: entry['test-payload-type'] }
        : {}),
    };
  });
}

/**
 * The IDs assigned to a manifest entry during a push, to write back into the
 * manifest file.
 */
export interface CustomFunctionManifestIds {
  /** Custom function ID */
  id?: string;
  /** Data silo (DSR integration) ID, for DSR functions */
  dataSiloId?: string;
}

/**
 * Write custom function and data silo IDs back into a manifest file, so
 * future pushes match by ID instead of by (potentially non-unique) name and
 * DSR entries keep pointing at their integration.
 *
 * The raw file text is edited via a comment- and formatting-preserving YAML
 * document, so comments and un-substituted `<<parameters.x>>` placeholders
 * survive untouched. Only entries that are missing the respective key are
 * modified.
 *
 * @param filePath - Path to the manifest YAML file
 * @param idsByIndex - IDs for each manifest entry, by array index (undefined
 *   entries are left unchanged)
 * @returns The number of entries that were updated
 */
export function writeCustomFunctionIdsToManifest(
  filePath: string,
  idsByIndex: (CustomFunctionManifestIds | undefined)[],
): number {
  const document = parseDocument(readFileSync(filePath, 'utf-8'));
  const functions = document.get('functions');
  if (!isSeq(functions)) {
    throw new Error(`Expected a \`functions\` list in manifest: ${filePath}`);
  }

  let updated = 0;
  functions.items.forEach((item, index) => {
    const ids = idsByIndex[index];
    if (!ids || !isMap(item)) {
      return;
    }
    let changed = false;
    if (ids.id && !item.has('id')) {
      // Place `id` first so it reads as the entry's key
      item.items.unshift(document.createPair('id', ids.id));
      changed = true;
    }
    if (ids.dataSiloId && !item.has('data-silo-id')) {
      // Place `data-silo-id` right after `id` (or first when there is no id)
      const idIndex = item.items.findIndex((pair) => isScalar(pair.key) && pair.key.value === 'id');
      item.items.splice(idIndex + 1, 0, document.createPair('data-silo-id', ids.dataSiloId));
      changed = true;
    }
    if (changed) {
      updated += 1;
    }
  });

  if (updated > 0) {
    writeFileSync(filePath, document.toString());
  }
  return updated;
}
