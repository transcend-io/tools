import { relative, sep } from 'node:path';

import {
  mergeJsonc,
  mergeStringArray,
  parseJsoncObject,
  type JsoncUpdate,
} from '../scaffolding/jsonc.js';
import { buildCustomFunctionProjectArguments } from './paths.js';

/**
 * Build target-scoped Deno authoring configuration.
 *
 * @param contents - Existing deno.json/jsonc contents
 * @param contractVersion - Exact authoring-contract version
 * @param manifestFileName - Manifest path relative to this Deno configuration
 * @param referencedPaths - Existing manifest-relative source and payload paths
 * @returns Merged configuration
 */
export function mergeDenoConfiguration(
  contents: string | null,
  contractVersion: string,
  manifestFileName = 'transcend-functions.yml',
  referencedPaths: {
    /** Existing source paths. */
    sources?: readonly string[];
    /** Existing payload paths. */
    payloads?: readonly string[];
  } = {},
): string {
  const current = parseJsoncObject(contents ?? '{}\n', 'Deno configuration');
  const compilerOptions =
    current.compilerOptions &&
    typeof current.compilerOptions === 'object' &&
    !Array.isArray(current.compilerOptions)
      ? (current.compilerOptions as Record<string, unknown>)
      : {};
  const lint =
    current.lint && typeof current.lint === 'object' && !Array.isArray(current.lint)
      ? (current.lint as Record<string, unknown>)
      : {};
  const fmt =
    current.fmt && typeof current.fmt === 'object' && !Array.isArray(current.fmt)
      ? (current.fmt as Record<string, unknown>)
      : {};
  const tasks =
    current.tasks && typeof current.tasks === 'object' && !Array.isArray(current.tasks)
      ? (current.tasks as Record<string, unknown>)
      : {};
  const taskName = 'custom-functions:check';
  const legacyTaskCommand =
    'deno check functions/**/*.ts && deno lint functions/ && deno fmt --check functions/ test-payloads/';
  const previousTaskCommand = `transcend custom-functions check ${buildCustomFunctionProjectArguments(
    '.',
    manifestFileName,
  )} --noInteractive`;
  const taskCommand = `transcend custom-functions check ${buildCustomFunctionProjectArguments(
    '.',
    manifestFileName,
  )} --variables=TRANSCEND_API_KEY:placeholder --noInteractive`;
  if (
    tasks[taskName] !== undefined &&
    tasks[taskName] !== legacyTaskCommand &&
    tasks[taskName] !== previousTaskCommand &&
    tasks[taskName] !== taskCommand
  ) {
    throw new Error(
      `Deno task "${taskName}" already has a different command; apply the patch manually.`,
    );
  }
  const updates: JsoncUpdate[] = [
    {
      path: ['imports', '@transcend-io/custom-function-types'],
      value: `npm:@transcend-io/custom-function-types@${contractVersion}`,
    },
    { path: ['compilerOptions', 'strict'], value: true },
    {
      path: ['compilerOptions', 'lib'],
      value: mergeStringArray(compilerOptions.lib, ['deno.ns', 'dom', 'dom.iterable', 'esnext']),
    },
    {
      path: ['lint', 'include'],
      value: mergeStringArray(lint.include, ['functions/', ...(referencedPaths.sources ?? [])]),
    },
    {
      path: ['fmt', 'include'],
      value: mergeStringArray(fmt.include, [
        'functions/',
        'test-payloads/',
        manifestFileName,
        ...(referencedPaths.sources ?? []),
        ...(referencedPaths.payloads ?? []),
      ]),
    },
    { path: ['fmt', 'singleQuote'], value: true },
    { path: ['fmt', 'lineWidth'], value: 100 },
    { path: ['tasks', taskName], value: taskCommand },
  ];
  return mergeJsonc(contents, updates, 'Deno configuration');
}

/**
 * Merge VS Code-compatible Deno settings scoped to the target.
 *
 * @param contents - Existing settings JSONC
 * @param repositoryRoot - Repository root
 * @param targetDirectory - Custom Function project directory
 * @returns Merged settings
 */
export function mergeEditorSettings(
  contents: string | null,
  repositoryRoot: string,
  targetDirectory: string,
): string {
  const current = parseJsoncObject(contents ?? '{}\n', 'editor settings');
  const target = relative(repositoryRoot, targetDirectory).split(sep).join('/') || '.';
  return mergeJsonc(
    contents,
    [
      { path: ['deno.enable'], value: true },
      {
        path: ['deno.enablePaths'],
        value: mergeStringArray(current['deno.enablePaths'], [target]),
      },
    ],
    'editor settings',
  );
}

/**
 * Merge the recommended Deno editor extension.
 *
 * @param contents - Existing extensions JSONC
 * @returns Merged extensions
 */
export function mergeEditorExtensions(contents: string | null): string {
  const current = parseJsoncObject(contents ?? '{}\n', 'editor extension recommendations');
  return mergeJsonc(
    contents,
    [
      {
        path: ['recommendations'],
        value: mergeStringArray(current.recommendations, ['denoland.vscode-deno']),
      },
    ],
    'editor extension recommendations',
  );
}
