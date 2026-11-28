import { posix } from 'node:path';

import { CustomFunctionType } from '@transcend-io/privacy-types';
import {
  decodeCustomFunctionContextFromJwt,
  decodeCustomFunctionSourceFromJwt,
  VARIABLE_PARAMETERS_NAME,
  type CustomFunction,
} from '@transcend-io/sdk';
import { isMap, isSeq, parseDocument, type YAMLMap } from 'yaml';

import { parseCustomFunctionsManifest, type CustomFunctionManifestEntry } from './manifest.js';
import { deriveCustomFunctionSlug } from './scaffold-templates.js';

/** One file to write when pulling custom functions from an org. */
export interface CustomFunctionPullFile {
  /** Path relative to the manifest directory */
  path: string;
  /** File contents */
  contents: string;
}

/** One remote custom function, decoded and ready to merge into a manifest. */
export interface CustomFunctionPullItem {
  /** ID of the function in the source organization */
  remoteId: string;
  /** Slug used for the source file name of a newly added entry */
  slug: string;
  /** Manifest entry, without a `code` path */
  entry: Omit<CustomFunctionManifestEntry, 'code'>;
  /** Decoded TypeScript source */
  source: string;
}

/** Result of planning a custom-functions pull. */
export interface CustomFunctionPullPlan {
  /** Decoded functions, sorted by name */
  items: CustomFunctionPullItem[];
  /** Function names that could not be decoded */
  skipped: string[];
  /** Names shared by more than one function, skipped because they cannot be matched without IDs */
  duplicateNames: string[];
  /** Env variable names written as `<<parameters.NAME>>` placeholders */
  variables: string[];
}

/** Options for planning a custom-functions pull. */
export interface CustomFunctionPullOptions {
  /** Keep the source organization's function, data silo, and Sombra IDs */
  includeIds?: boolean;
}

/** Manifest fields that `pull --force` refreshes from the organization. */
const REMOTE_OWNED_FIELDS = [
  'description',
  'type',
  'allowed-hosts',
  'timeout-ms',
  'allow-third-party-imports',
] as const satisfies readonly (keyof CustomFunctionManifestEntry)[];

/**
 * Pick the signed code JWT that best represents the version to materialize locally.
 *
 * @param customFunction - Remote custom function
 * @returns JWT string
 */
export function preferredSignedCodeJwt(customFunction: CustomFunction): string {
  if (customFunction.hasPendingDraft && customFunction.draftVersion?.signedCodeJwt) {
    return customFunction.draftVersion.signedCodeJwt;
  }
  if (customFunction.activeVersion?.signedCodeJwt) {
    return customFunction.activeVersion.signedCodeJwt;
  }
  return customFunction.signedCodeJwt;
}

/**
 * Build the manifest placeholder for an env variable.
 *
 * @param name - Env variable name
 * @returns `<<parameters.NAME>>`
 */
function envPlaceholder(name: string): string {
  return `<<${VARIABLE_PARAMETERS_NAME}.${name}>>`;
}

/**
 * Derive a source file slug, falling back to the ID for names that cannot be slugified.
 *
 * @param customFunction - Remote custom function
 * @returns Filesystem-safe slug
 */
function pullSlug(customFunction: CustomFunction): string {
  try {
    return deriveCustomFunctionSlug(customFunction.name);
  } catch {
    return `custom-function-${customFunction.id.slice(0, 8)}`;
  }
}

/**
 * Decode one remote custom function into a manifest entry and source.
 *
 * @param customFunction - Remote custom function
 * @param options - Pull options
 * @returns The decoded item, or undefined when code cannot be decoded
 */
export function buildCustomFunctionPullItem(
  customFunction: CustomFunction,
  options: CustomFunctionPullOptions = {},
): CustomFunctionPullItem | undefined {
  const source = decodeCustomFunctionSourceFromJwt(preferredSignedCodeJwt(customFunction));
  if (source === undefined) {
    return undefined;
  }
  const context = decodeCustomFunctionContextFromJwt(customFunction.signedCodeContextJwt);

  const entry: Omit<CustomFunctionManifestEntry, 'code'> = {
    name: customFunction.name,
    ...(options.includeIds ? { id: customFunction.id } : {}),
    ...(customFunction.description ? { description: customFunction.description } : {}),
    ...(customFunction.type !== CustomFunctionType.General ? { type: customFunction.type } : {}),
    ...(options.includeIds && customFunction.dataSiloId
      ? { 'data-silo-id': customFunction.dataSiloId }
      : {}),
    ...(options.includeIds && customFunction.sombraId
      ? { 'sombra-id': customFunction.sombraId }
      : {}),
    ...(context?.allowedHosts?.length ? { 'allowed-hosts': context.allowedHosts } : {}),
    ...(context?.allowThirdPartyImports !== undefined
      ? { 'allow-third-party-imports': context.allowThirdPartyImports }
      : {}),
    ...(context?.timeoutMs !== undefined ? { 'timeout-ms': context.timeoutMs } : {}),
    ...(context?.envKeys?.length
      ? { env: Object.fromEntries(context.envKeys.map((key) => [key, envPlaceholder(key)])) }
      : {}),
  };

  return { remoteId: customFunction.id, slug: pullSlug(customFunction), entry, source };
}

/**
 * Plan a pull of all custom functions from an organization.
 *
 * @param customFunctions - Functions from the org
 * @param options - Pull options
 * @returns Decoded items plus the names that were skipped
 */
export function buildCustomFunctionPullPlan(
  customFunctions: CustomFunction[],
  options: CustomFunctionPullOptions = {},
): CustomFunctionPullPlan {
  const nameCounts = new Map<string, number>();
  customFunctions.forEach(({ name }) => nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1));

  const items: CustomFunctionPullItem[] = [];
  const skipped: string[] = [];
  const duplicateNames = new Set<string>();
  const variables = new Set<string>();

  const sorted = [...customFunctions].sort((a, b) => a.name.localeCompare(b.name));
  for (const customFunction of sorted) {
    if (!options.includeIds && (nameCounts.get(customFunction.name) ?? 0) > 1) {
      duplicateNames.add(customFunction.name);
      continue;
    }
    const item = buildCustomFunctionPullItem(customFunction, options);
    if (!item) {
      skipped.push(customFunction.name);
      continue;
    }
    Object.keys(item.entry.env ?? {}).forEach((key) => variables.add(key));
    items.push(item);
  }

  return {
    items,
    skipped,
    duplicateNames: [...duplicateNames],
    variables: [...variables].sort(),
  };
}

/** Result of merging a pull plan into a manifest. */
export interface CustomFunctionPullMergeResult {
  /** Updated manifest YAML */
  contents: string;
  /** Source files to write, relative to the manifest directory */
  files: (CustomFunctionPullFile & {
    /** True when the file belongs to a newly appended entry */
    isNew: boolean;
  })[];
  /** Names of entries appended to the manifest */
  added: string[];
  /** Names of existing entries refreshed from the organization (`force` only) */
  updated: string[];
  /** Names of existing entries left untouched */
  kept: string[];
}

/**
 * Normalize a manifest-relative path so `./a.ts` and `a.ts` compare equal.
 *
 * @param path - Manifest-relative path
 * @returns Normalized POSIX path
 */
function normalizeManifestPath(path: string): string {
  return posix.normalize(path.replaceAll('\\', '/'));
}

/**
 * Refresh remote-owned fields and add missing env placeholders on an existing entry.
 *
 * @param document - Manifest YAML document
 * @param item - Existing manifest entry node
 * @param entry - Entry decoded from the organization
 */
function refreshManifestEntry(
  document: ReturnType<typeof parseDocument>,
  item: YAMLMap,
  entry: Omit<CustomFunctionManifestEntry, 'code'>,
): void {
  REMOTE_OWNED_FIELDS.forEach((field) => {
    const value = entry[field];
    if (value === undefined) {
      item.delete(field);
    } else {
      item.set(field, document.createNode(value));
    }
  });

  const remoteEnv = entry.env ?? {};
  if (Object.keys(remoteEnv).length === 0) {
    return;
  }
  const localEnv = item.get('env');
  if (!isMap(localEnv)) {
    item.set('env', document.createNode(remoteEnv));
    return;
  }
  Object.entries(remoteEnv).forEach(([key, placeholder]) => {
    if (!localEnv.has(key)) {
      localEnv.set(key, placeholder);
    }
  });
}

/**
 * Merge pulled functions into a manifest, preserving comments, placeholders,
 * test payloads, and IDs already in the file.
 *
 * Remote functions match existing entries by `id`, else by a unique `name`.
 * Unmatched functions are appended. Matched entries are left alone unless
 * `force` is set, which overwrites their source file and refreshes
 * remote-owned settings.
 *
 * @param existingContents - Current manifest YAML, or undefined when there is none
 * @param plan - Pull plan
 * @param options - Merge options
 * @returns Updated manifest contents and the source files to write
 */
export function mergeCustomFunctionPullIntoManifest(
  existingContents: string | undefined,
  plan: CustomFunctionPullPlan,
  options: {
    /** Overwrite matched entries' source files and settings */
    force: boolean;
  },
): CustomFunctionPullMergeResult {
  const contents = existingContents ?? 'functions: []\n';
  const existing = parseCustomFunctionsManifest(contents).functions;
  const document = parseDocument(contents);
  const functions = document.get('functions');
  if (!isSeq(functions)) {
    throw new Error('Expected a `functions` list in custom function manifest');
  }

  const usedPaths = new Set(existing.map(({ code }) => normalizeManifestPath(code)));
  const result: Omit<CustomFunctionPullMergeResult, 'contents'> = {
    files: [],
    added: [],
    updated: [],
    kept: [],
  };

  plan.items.forEach((pulled) => {
    const idIndex = existing.findIndex(({ id }) => id === pulled.remoteId);
    const nameIndexes = existing.flatMap(({ name }, index) =>
      name === pulled.entry.name ? [index] : [],
    );
    const matchIndex = idIndex >= 0 ? idIndex : nameIndexes.length === 1 ? nameIndexes[0] : -1;

    if (matchIndex === undefined || matchIndex < 0) {
      if (nameIndexes.length > 1) {
        result.kept.push(pulled.entry.name);
        return;
      }
      let path = `functions/${pulled.slug}.ts`;
      for (let suffix = 2; usedPaths.has(path); suffix += 1) {
        path = `functions/${pulled.slug}-${suffix}.ts`;
      }
      usedPaths.add(path);
      if (functions.items.length === 0) {
        functions.flow = false;
      }
      functions.add(document.createNode({ ...pulled.entry, code: path }));
      result.files.push({ path, contents: pulled.source, isNew: true });
      result.added.push(pulled.entry.name);
      return;
    }

    if (!options.force) {
      result.kept.push(pulled.entry.name);
      return;
    }
    const item = functions.items[matchIndex];
    if (!isMap(item)) {
      throw new Error(`Expected manifest entry "${pulled.entry.name}" to be a map`);
    }
    refreshManifestEntry(document, item, pulled.entry);
    result.files.push({
      path: normalizeManifestPath(existing[matchIndex]!.code),
      contents: pulled.source,
      isNew: false,
    });
    result.updated.push(pulled.entry.name);
  });

  const updatedContents = document.toString();
  parseCustomFunctionsManifest(updatedContents);
  return { contents: updatedContents, ...result };
}
