import { CustomFunctionType } from '@transcend-io/privacy-types';
import {
  decodeCustomFunctionContextFromJwt,
  decodeCustomFunctionSourceFromJwt,
  type CustomFunction,
} from '@transcend-io/sdk';

import type { CustomFunctionManifestEntry } from './manifest.js';
import { deriveCustomFunctionSlug } from './scaffold-templates.js';

/** One file to write when pulling custom functions from an org. */
export interface CustomFunctionPullFile {
  /** Path relative to the manifest directory */
  path: string;
  /** File contents */
  contents: string;
}

/** Result of planning a custom-functions pull. */
export interface CustomFunctionPullPlan {
  /** Manifest entries */
  functions: CustomFunctionManifestEntry[];
  /** Source files to write */
  files: CustomFunctionPullFile[];
  /** Function names that could not be decoded */
  skipped: string[];
  /** True when any function had encrypted env keys that could not be materialized */
  hasEncryptedEnv: boolean;
}

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
 * Build a manifest entry and source file for one remote custom function.
 *
 * @param customFunction - Remote custom function
 * @returns Entry and file, or undefined when code cannot be decoded
 */
export function buildCustomFunctionPullEntry(
  customFunction: CustomFunction,
): { entry: CustomFunctionManifestEntry; file: CustomFunctionPullFile } | undefined {
  const source = decodeCustomFunctionSourceFromJwt(preferredSignedCodeJwt(customFunction));
  if (source === undefined) {
    return undefined;
  }

  const slug = deriveCustomFunctionSlug(customFunction.name);
  const codePath = `functions/${slug}.ts`;
  const context = decodeCustomFunctionContextFromJwt(customFunction.signedCodeContextJwt);

  const entry: CustomFunctionManifestEntry = {
    name: customFunction.name,
    id: customFunction.id,
    code: codePath,
    ...(customFunction.description ? { description: customFunction.description } : {}),
    ...(customFunction.type !== CustomFunctionType.General ? { type: customFunction.type } : {}),
    ...(customFunction.dataSiloId ? { 'data-silo-id': customFunction.dataSiloId } : {}),
    ...(customFunction.sombraId ? { 'sombra-id': customFunction.sombraId } : {}),
    ...(context?.allowedHosts?.length ? { 'allowed-hosts': context.allowedHosts } : {}),
    ...(context?.allowThirdPartyImports !== undefined
      ? { 'allow-third-party-imports': context.allowThirdPartyImports }
      : {}),
    ...(context?.timeoutMs !== undefined ? { 'timeout-ms': context.timeoutMs } : {}),
  };

  return {
    entry,
    file: { path: codePath, contents: source },
  };
}

/**
 * Plan a pull of all custom functions into a local manifest project.
 *
 * @param customFunctions - Functions from the org
 * @returns Manifest rows, files, and skipped names
 */
export function buildCustomFunctionPullPlan(
  customFunctions: CustomFunction[],
): CustomFunctionPullPlan {
  const functions: CustomFunctionManifestEntry[] = [];
  const files: CustomFunctionPullFile[] = [];
  const skipped: string[] = [];
  let hasEncryptedEnv = false;

  const sorted = [...customFunctions].sort((a, b) => a.name.localeCompare(b.name));
  for (const customFunction of sorted) {
    const built = buildCustomFunctionPullEntry(customFunction);
    if (!built) {
      skipped.push(customFunction.name);
      continue;
    }
    const context = decodeCustomFunctionContextFromJwt(customFunction.signedCodeContextJwt);
    if (context?.envKeys?.length) {
      hasEncryptedEnv = true;
    }
    functions.push(built.entry);
    files.push(built.file);
  }

  return { functions, files, skipped, hasEncryptedEnv };
}
