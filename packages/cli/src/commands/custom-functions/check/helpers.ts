import { dirname, extname, join, relative, resolve, sep } from 'node:path';

import {
  DSR_DATAPOINT_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
  DSR_REQUEST_ENRICHER_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
  GENERAL_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
} from '@transcend-io/custom-function-types';
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import { createTwoFilesPatch } from 'diff';
import { parse as parseJsonc } from 'jsonc-parser';

import type { LocalContext } from '../../../context.js';
import {
  runCapturedProcess,
  type CapturedProcessResult,
  type CapturedProcessRunner,
} from '../../../lib/cli/run-captured-process.js';
import {
  type CustomFunctionCheckResult,
  type CustomFunctionCheckStatus,
  type CustomFunctionDiagnostic,
} from '../../../lib/custom-functions/check-model.js';
import {
  DENO_INSTALL_URL,
  getDenoRuntimeCompatibility,
  SUPPORTED_DENO_MAJOR_VERSION,
} from '../../../lib/custom-functions/deno-runtime.js';
import { validateCustomFunctionExecutionContext } from '../../../lib/custom-functions/execution-context.js';
import {
  isCustomFunctionManifestPathContained,
  parseCustomFunctionsManifest,
  type CustomFunctionManifestEntry,
} from '../../../lib/custom-functions/manifest.js';
import { findNonSelfContainedRuntimeImports } from '../../../lib/custom-functions/module-graph.js';
import { CUSTOM_FUNCTION_RESULT_VERSION } from '../../../lib/custom-functions/scaffold-model.js';
import { replaceVariablesInYaml } from '../../../lib/readTranscendYaml.js';
import {
  assertPathPhysicallyContained,
  isPathPhysicallyContained,
} from '../../../lib/scaffolding/path-safety.js';
import { applyProjectPlan } from '../../../lib/scaffolding/project-plan-apply.js';
import type { PlannedFileChange } from '../../../lib/scaffolding/project-plan.js';

/** Payload file plus its validation contract. */
interface PayloadReference {
  /** Manifest entry. */
  entry: CustomFunctionManifestEntry;
  /** Manifest-relative payload path. */
  path: string;
  /** Schema variant. */
  type: 'general' | 'dsr-datapoint' | 'dsr-enricher';
}

/** Source file plus exports required by fixtures. */
interface SourceReference {
  /** Manifest entry. */
  entry: CustomFunctionManifestEntry;
  /** Absolute source path. */
  path: string;
  /** Whether a default export is required. */
  needsDefault: boolean;
  /** Whether an enricher export is required. */
  needsEnricher: boolean;
  /** Whether either DSR export is acceptable when no fixtures identify one. */
  needsAnyDsrExport: boolean;
}

/** Options for local validation. */
export interface RunCustomFunctionChecksOptions {
  /** Absolute manifest path. */
  manifestPath: string;
  /** Variables used to resolve manifest placeholders. */
  variables?: Record<string, string>;
  /** Apply Deno formatting. */
  fix: boolean;
  /** Ask for an interactive formatting repair after receiving a patch. */
  confirmFormat?: (patch: string) => Promise<boolean>;
  /** Include a unified format patch in human-oriented diagnostics. */
  includeFormatPatchInDiagnostics?: boolean;
}

/**
 * Add one diagnostic.
 *
 * @param diagnostics - Result collection
 * @param diagnostic - Diagnostic without severity
 */
function addError(
  diagnostics: CustomFunctionDiagnostic[],
  diagnostic: Omit<CustomFunctionDiagnostic, 'severity'>,
): void {
  diagnostics.push({ severity: 'error', ...diagnostic });
}

/**
 * Normalize an absolute path relative to the manifest.
 *
 * @param manifestDirectory - Manifest directory
 * @param path - Absolute path
 * @returns Portable display path
 */
function relativePath(manifestDirectory: string, path: string): string {
  const value = relative(manifestDirectory, path).split(sep).join('/');
  return value || '.';
}

/**
 * Select all payload files and schema variants.
 *
 * @param entry - Manifest entry
 * @returns Payload references
 */
function payloadReferences(entry: CustomFunctionManifestEntry): PayloadReference[] {
  const variant = (
    payloadType: 'DATA_POINT' | 'REQUEST_ENRICHER' | undefined,
  ): PayloadReference['type'] => {
    if (entry.type !== 'DSR') {
      return 'general';
    }
    return payloadType === 'REQUEST_ENRICHER' ? 'dsr-enricher' : 'dsr-datapoint';
  };
  if (entry['test-payload']) {
    return [
      {
        entry,
        path: entry['test-payload'],
        type: variant(entry['test-payload-type']),
      },
    ];
  }
  return (entry['test-payloads'] ?? []).map((item) => ({
    entry,
    path: item.payload,
    type: variant(item['payload-type']),
  }));
}

/**
 * Select export expectations from the registered fixtures.
 *
 * @param entry - Manifest entry
 * @param manifestDirectory - Manifest directory
 * @returns Source reference
 */
function sourceReference(
  entry: CustomFunctionManifestEntry,
  manifestDirectory: string,
): SourceReference {
  const payloadTypes = payloadReferences(entry).map(({ type }) => type);
  const dsrWithoutPayloads = entry.type === 'DSR' && payloadTypes.length === 0;
  return {
    entry,
    path: resolve(manifestDirectory, entry.code),
    needsDefault: entry.type !== 'DSR' || payloadTypes.includes('dsr-datapoint'),
    needsEnricher: payloadTypes.includes('dsr-enricher'),
    needsAnyDsrExport: dsrWithoutPayloads,
  };
}

/**
 * Compile published payload schemas.
 *
 * @returns Validators by local variant
 */
function buildPayloadValidators(): Record<PayloadReference['type'], ValidateFunction> {
  const ajv = new Ajv({ allErrors: true, strict: false });
  return {
    general: ajv.compile(GENERAL_CUSTOM_FUNCTION_PAYLOAD_SCHEMA),
    'dsr-datapoint': ajv.compile(DSR_DATAPOINT_CUSTOM_FUNCTION_PAYLOAD_SCHEMA),
    'dsr-enricher': ajv.compile(DSR_REQUEST_ENRICHER_CUSTOM_FUNCTION_PAYLOAD_SCHEMA),
  };
}

/**
 * Format one Ajv failure.
 *
 * @param error - Ajv error
 * @returns Concise path and message
 */
function formatSchemaError(error: ErrorObject): string {
  return `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`;
}

/**
 * Validate referenced source and payload files without invoking Deno.
 *
 * @param context - CLI context
 * @param manifestDirectory - Manifest directory
 * @param entries - Parsed manifest entries
 * @param diagnostics - Result collection
 * @returns Existing source and format paths
 */
function validateReferencedFiles(
  context: LocalContext,
  manifestDirectory: string,
  entries: readonly CustomFunctionManifestEntry[],
  diagnostics: CustomFunctionDiagnostic[],
): {
  /** Existing source references. */
  sources: SourceReference[];
  /** Existing payload paths. */
  payloadPaths: string[];
} {
  const validators = buildPayloadValidators();
  const sources: SourceReference[] = [];
  const payloadPaths: string[] = [];
  entries.forEach((entry) => {
    if (/<<parameters\.[^>]+>>/u.test(entry.code)) {
      addError(diagnostics, {
        code: 'manifest.unresolved-code-path',
        message: 'Code paths cannot contain unresolved parameter placeholders.',
        path: entry.code,
        functionName: entry.name,
      });
    } else if (isCustomFunctionManifestPathContained(entry.code)) {
      const source = sourceReference(entry, manifestDirectory);
      if (!context.fs.existsSync(source.path)) {
        addError(diagnostics, {
          code: 'source.missing',
          message: 'Referenced source file does not exist.',
          path: entry.code,
          functionName: entry.name,
        });
      } else if (!isPathPhysicallyContained(context, manifestDirectory, source.path)) {
        addError(diagnostics, {
          code: 'source.outside-project',
          message: 'Referenced source resolves outside the manifest directory through a symlink.',
          path: entry.code,
          functionName: entry.name,
        });
      } else if (!context.fs.statSync(source.path).isFile()) {
        addError(diagnostics, {
          code: 'source.not-file',
          message: 'Referenced source path is not a regular file.',
          path: entry.code,
          functionName: entry.name,
        });
      } else {
        sources.push(source);
      }
    }

    payloadReferences(entry).forEach((reference) => {
      if (/<<parameters\.[^>]+>>/u.test(reference.path)) {
        addError(diagnostics, {
          code: 'manifest.unresolved-payload-path',
          message: 'Payload paths cannot contain unresolved parameter placeholders.',
          path: reference.path,
          functionName: entry.name,
        });
        return;
      }
      const payloadPath = resolve(manifestDirectory, reference.path);
      if (!context.fs.existsSync(payloadPath)) {
        addError(diagnostics, {
          code: 'payload.missing',
          message: 'Referenced test payload does not exist.',
          path: reference.path,
          functionName: entry.name,
        });
        return;
      }
      if (!isPathPhysicallyContained(context, manifestDirectory, payloadPath)) {
        addError(diagnostics, {
          code: 'payload.outside-project',
          message:
            'Referenced test payload resolves outside the manifest directory through a symlink.',
          path: reference.path,
          functionName: entry.name,
        });
        return;
      }
      if (!context.fs.statSync(payloadPath).isFile()) {
        addError(diagnostics, {
          code: 'payload.not-file',
          message: 'Referenced test payload is not a regular file.',
          path: reference.path,
          functionName: entry.name,
        });
        return;
      }
      payloadPaths.push(payloadPath);
      let payload: unknown;
      try {
        payload = JSON.parse(context.fs.readFileSync(payloadPath, 'utf8'));
      } catch (error) {
        addError(diagnostics, {
          code: 'payload.invalid-json',
          message: `Invalid JSON: ${(error as Error).message}`,
          path: reference.path,
          functionName: entry.name,
        });
        return;
      }
      const validate = validators[reference.type];
      if (!validate(payload)) {
        (validate.errors ?? []).forEach((error) =>
          addError(diagnostics, {
            code: 'payload.schema',
            message: formatSchemaError(error),
            path: reference.path,
            functionName: entry.name,
          }),
        );
      }
    });
  });
  return {
    sources,
    payloadPaths: [...new Set(payloadPaths)],
  };
}

/**
 * Read Deno's JSON documentation output for exported names.
 *
 * @param output - `deno doc --json` output
 * @returns Exported names
 */
function exportedNames(output: string): Set<string> {
  try {
    const document = JSON.parse(output) as unknown;
    const nodes = Array.isArray(document)
      ? document
      : document &&
          typeof document === 'object' &&
          Array.isArray((document as Record<string, unknown>).nodes)
        ? ((document as Record<string, unknown>).nodes as unknown[])
        : undefined;
    if (!nodes) {
      return new Set();
    }
    return new Set(
      nodes.flatMap((node) => {
        if (!node || typeof node !== 'object') {
          return [];
        }
        const name = (node as Record<string, unknown>).name;
        return typeof name === 'string' ? [name] : [];
      }),
    );
  } catch {
    return new Set();
  }
}

/**
 * Choose the Deno formatter extension for stdin.
 *
 * @param path - Source path
 * @returns Deno extension
 */
function denoExtension(path: string): string {
  switch (extname(path)) {
    case '.ts':
    case '.tsx':
      return 'ts';
    case '.json':
    case '.jsonc':
      return 'json';
    case '.yaml':
    case '.yml':
      return 'yaml';
    default:
      return 'ts';
  }
}

/**
 * Resolve the import-map input supported by `deno doc`.
 *
 * Deno 2.4 does not expose `--config` for `doc`. A config with inline
 * `imports` is itself a valid import map; an `importMap` reference must be
 * followed explicitly.
 *
 * @param context - CLI context
 * @param manifestDirectory - Approved project root
 * @param configPath - Selected Deno config
 * @returns Import map path or URL
 */
function resolveDocImportMap(
  context: LocalContext,
  manifestDirectory: string,
  configPath: string | undefined,
): string | undefined {
  if (!configPath) {
    return undefined;
  }
  const config = parseJsonc(context.fs.readFileSync(configPath, 'utf8')) as {
    /** Optional separate import map. */
    importMap?: unknown;
  };
  if (typeof config?.importMap !== 'string') {
    return configPath;
  }
  if (/^[a-z][a-z\d+.-]*:/iu.test(config.importMap)) {
    return config.importMap;
  }
  const importMapPath = resolve(dirname(configPath), config.importMap);
  assertPathPhysicallyContained(context, manifestDirectory, importMapPath);
  return importMapPath;
}

/**
 * Render deterministic formatter patches without changing files.
 *
 * @param context - CLI context
 * @param runner - Process runner
 * @param manifestDirectory - Working directory
 * @param configArgs - Deno config arguments
 * @param paths - Target files
 * @returns Unified patches and transactional file changes
 */
async function buildFormatPlan(
  context: LocalContext,
  runner: CapturedProcessRunner,
  manifestDirectory: string,
  configArgs: readonly string[],
  paths: readonly string[],
): Promise<{ patch: string; changes: PlannedFileChange[] }> {
  const patches: string[] = [];
  const changes: PlannedFileChange[] = [];
  for (const path of paths) {
    assertPathPhysicallyContained(context, manifestDirectory, path);
    const before = context.fs.readFileSync(path, 'utf8');
    const result = await runner(
      'deno',
      ['fmt', ...configArgs, `--ext=${denoExtension(path)}`, '-'],
      { cwd: manifestDirectory, input: before },
      context,
    );
    if (result.code !== 0) {
      throw new Error(
        `Deno could not preview formatting for ${relativePath(manifestDirectory, path)}.${
          result.stderr.trim() ? `\n${result.stderr.trim()}` : ''
        }`,
      );
    }
    if (result.stdout !== before) {
      const display = relativePath(manifestDirectory, path);
      patches.push(
        createTwoFilesPatch(display, display, before, result.stdout, '', '', { context: 3 }),
      );
      changes.push({
        kind: 'file',
        path,
        before,
        after: result.stdout,
        description: `Format ${display}`,
        mode: context.fs.statSync(path).mode,
      });
    }
  }
  return { patch: patches.join('\n'), changes };
}

/**
 * Record one Deno command failure.
 *
 * @param diagnostics - Result collection
 * @param code - Stable code
 * @param message - Summary
 * @param result - Captured process result
 */
function recordDenoFailure(
  diagnostics: CustomFunctionDiagnostic[],
  code: string,
  message: string,
  result: CapturedProcessResult,
): void {
  addError(diagnostics, {
    code,
    message: `${message}${result.stderr.trim() ? `\n${result.stderr.trim()}` : ''}`,
  });
}

/**
 * Run credential-free local validation without executing user modules.
 *
 * @param context - CLI context
 * @param options - Manifest and format behavior
 * @param runner - Captured process runner
 * @returns Stable check result
 */
export async function runCustomFunctionChecks(
  context: LocalContext,
  options: RunCustomFunctionChecksOptions,
  runner: CapturedProcessRunner = runCapturedProcess,
): Promise<CustomFunctionCheckResult> {
  const manifestPath = resolve(options.manifestPath);
  const manifestDirectory = dirname(manifestPath);
  const diagnostics: CustomFunctionDiagnostic[] = [];
  const statuses = new Map<string, CustomFunctionCheckStatus>([
    ['manifest', 'passed'],
    ['files', 'passed'],
    ['payloads', 'passed'],
    ['runtime', 'passed'],
    ['exports', 'passed'],
    ['typecheck', 'passed'],
    ['lint', 'passed'],
    ['format', 'passed'],
  ]);
  const buildResult = (): CustomFunctionCheckResult => ({
    version: CUSTOM_FUNCTION_RESULT_VERSION,
    status: diagnostics.some(({ severity }) => severity === 'error') ? 'failed' : 'passed',
    manifestPath,
    checks: [...statuses].map(([name, status]) => ({ name, status })),
    diagnostics,
  });
  if (!context.fs.existsSync(manifestPath)) {
    addError(diagnostics, {
      code: 'manifest.missing',
      message: 'Custom Function manifest does not exist.',
      path: relativePath(context.process.cwd(), manifestPath),
    });
    statuses.set('manifest', 'failed');
    ['files', 'payloads', 'runtime', 'exports', 'typecheck', 'lint', 'format'].forEach((name) =>
      statuses.set(name, 'skipped'),
    );
    return buildResult();
  }

  let entries: readonly CustomFunctionManifestEntry[] = [];
  try {
    const manifestContents = replaceVariablesInYaml(
      context.fs.readFileSync(manifestPath, 'utf8'),
      options.variables ?? {},
    );
    entries = parseCustomFunctionsManifest(manifestContents).functions;
  } catch (error) {
    addError(diagnostics, {
      code: 'manifest.invalid',
      message: (error as Error).message,
      path: relativePath(manifestDirectory, manifestPath),
    });
    statuses.set('manifest', 'failed');
    ['files', 'payloads', 'runtime', 'exports', 'typecheck', 'lint', 'format'].forEach((name) =>
      statuses.set(name, 'skipped'),
    );
    return buildResult();
  }
  entries.forEach((entry) => {
    try {
      validateCustomFunctionExecutionContext({
        ...(entry.env ? { env: entry.env } : {}),
        ...(entry['allowed-hosts'] ? { allowedHosts: entry['allowed-hosts'] } : {}),
      });
    } catch (error) {
      statuses.set('manifest', 'failed');
      addError(diagnostics, {
        code: 'manifest.execution-context',
        message: (error as Error).message,
        path: relativePath(manifestDirectory, manifestPath),
        functionName: entry.name,
      });
    }
  });

  const { sources, payloadPaths } = validateReferencedFiles(
    context,
    manifestDirectory,
    entries,
    diagnostics,
  );
  if (
    diagnostics.some(({ code }) =>
      ['source.', 'manifest.unresolved-code-path'].some((prefix) => code.startsWith(prefix)),
    )
  ) {
    statuses.set('files', 'failed');
    ['exports', 'typecheck', 'lint'].forEach((name) => statuses.set(name, 'failed'));
  }
  if (
    diagnostics.some(({ code }) =>
      ['payload.', 'manifest.unresolved-payload-path'].some((prefix) => code.startsWith(prefix)),
    )
  ) {
    statuses.set('payloads', 'failed');
  }

  const denoJsonc = join(manifestDirectory, 'deno.jsonc');
  const denoJson = join(manifestDirectory, 'deno.json');
  const configPath = context.fs.existsSync(denoJsonc)
    ? denoJsonc
    : context.fs.existsSync(denoJson)
      ? denoJson
      : undefined;
  const unsafeConfig =
    configPath !== undefined && !isPathPhysicallyContained(context, manifestDirectory, configPath);
  let unsafeConfiguration = unsafeConfig;
  let docImportMap: string | undefined;
  if (unsafeConfig) {
    addError(diagnostics, {
      code: 'deno.config-outside-project',
      message: 'Deno configuration resolves outside the manifest directory through a symlink.',
      path: relativePath(manifestDirectory, configPath),
    });
    ['exports', 'typecheck', 'lint', 'format'].forEach((name) => statuses.set(name, 'failed'));
  } else {
    try {
      docImportMap = resolveDocImportMap(context, manifestDirectory, configPath);
    } catch (error) {
      unsafeConfiguration = true;
      addError(diagnostics, {
        code: 'deno.import-map-outside-project',
        message: (error as Error).message,
      });
      ['exports', 'typecheck', 'lint', 'format'].forEach((name) => statuses.set(name, 'failed'));
    }
  }
  const configArgs =
    configPath && !unsafeConfiguration ? [`--config=${configPath}`] : ['--no-config'];
  const skipPendingDenoChecks = (): void => {
    ['exports', 'typecheck', 'lint', 'format'].forEach((name) => {
      if (statuses.get(name) !== 'failed') {
        statuses.set(name, 'skipped');
      }
    });
  };
  const denoVersion = await runner('deno', ['--version'], { cwd: manifestDirectory }, context);
  const compatibility =
    denoVersion.code === 0 ? getDenoRuntimeCompatibility(denoVersion.stdout) : undefined;
  if (compatibility?.level === 'warning') {
    diagnostics.push({
      code: 'deno.version-mismatch',
      severity: 'warning',
      message: compatibility.message,
    });
  }
  if (denoVersion.error?.code === 'ENOENT') {
    statuses.set('runtime', 'failed');
    skipPendingDenoChecks();
    addError(diagnostics, {
      code: 'deno.missing',
      message: `Deno ${SUPPORTED_DENO_MAJOR_VERSION}.x is required for export, type, lint, and format checks. Install it from ${DENO_INSTALL_URL}`,
    });
  } else if (denoVersion.code !== 0) {
    statuses.set('runtime', 'failed');
    skipPendingDenoChecks();
    recordDenoFailure(diagnostics, 'deno.unavailable', 'Deno could not be started.', denoVersion);
  } else if (compatibility?.level === 'error') {
    statuses.set('runtime', 'failed');
    skipPendingDenoChecks();
    addError(diagnostics, {
      code: 'deno.unsupported-version',
      message: compatibility.message,
    });
  } else if (!unsafeConfiguration) {
    for (const source of sources) {
      const moduleGraph = await runner(
        'deno',
        ['info', '--json', ...configArgs, source.path],
        { cwd: manifestDirectory },
        context,
      );
      if (moduleGraph.code !== 0) {
        statuses.set('files', 'failed');
        recordDenoFailure(
          diagnostics,
          'source.module-graph',
          `Could not inspect runtime imports for ${relativePath(manifestDirectory, source.path)}.`,
          moduleGraph,
        );
      } else {
        try {
          const unsupportedImports = findNonSelfContainedRuntimeImports(moduleGraph.stdout);
          if (unsupportedImports.length > 0) {
            statuses.set('files', 'failed');
            addError(diagnostics, {
              code: 'source.local-runtime-import',
              message:
                'Custom Functions must be self-contained. Local or import-map runtime dependencies are not deployed: ' +
                unsupportedImports.join(', '),
              path: relativePath(manifestDirectory, source.path),
              functionName: source.entry.name,
            });
          }
        } catch (error) {
          statuses.set('files', 'failed');
          addError(diagnostics, {
            code: 'source.module-graph',
            message: (error as Error).message,
            path: relativePath(manifestDirectory, source.path),
            functionName: source.entry.name,
          });
        }
      }
      const result = await runner(
        'deno',
        ['doc', '--json', ...(docImportMap ? ['--import-map', docImportMap] : []), source.path],
        { cwd: manifestDirectory },
        context,
      );
      if (result.code !== 0) {
        statuses.set('exports', 'failed');
        recordDenoFailure(
          diagnostics,
          'exports.inspect',
          `Could not inspect exports for ${relativePath(manifestDirectory, source.path)}.`,
          result,
        );
        continue;
      }
      const names = exportedNames(result.stdout);
      if (source.needsDefault && !names.has('default')) {
        statuses.set('exports', 'failed');
        addError(diagnostics, {
          code: 'exports.default-missing',
          message: 'The manifest fixtures require a default export.',
          path: relativePath(manifestDirectory, source.path),
          functionName: source.entry.name,
        });
      }
      if (source.needsEnricher && !names.has('enricher')) {
        statuses.set('exports', 'failed');
        addError(diagnostics, {
          code: 'exports.enricher-missing',
          message: 'A REQUEST_ENRICHER fixture requires an `enricher` export.',
          path: relativePath(manifestDirectory, source.path),
          functionName: source.entry.name,
        });
      }
      if (source.needsAnyDsrExport && !names.has('default') && !names.has('enricher')) {
        statuses.set('exports', 'failed');
        addError(diagnostics, {
          code: 'exports.dsr-missing',
          message: 'A DSR Custom Function requires a `default` or `enricher` export.',
          path: relativePath(manifestDirectory, source.path),
          functionName: source.entry.name,
        });
      }
    }

    const sourcePaths = [...new Set(sources.map(({ path }) => path))];
    if (sourcePaths.length > 0) {
      const typecheck = await runner(
        'deno',
        ['check', ...configArgs, ...sourcePaths],
        { cwd: manifestDirectory },
        context,
      );
      if (typecheck.code !== 0) {
        statuses.set('typecheck', 'failed');
        recordDenoFailure(diagnostics, 'deno.typecheck', 'Deno type checking failed.', typecheck);
      }
      const lint = await runner(
        'deno',
        ['lint', ...configArgs, ...sourcePaths],
        { cwd: manifestDirectory },
        context,
      );
      if (lint.code !== 0) {
        statuses.set('lint', 'failed');
        recordDenoFailure(diagnostics, 'deno.lint', 'Deno linting failed.', lint);
      }
    }

    const formatPaths = [
      ...sourcePaths,
      ...payloadPaths,
      manifestPath,
      ...(configPath ? [configPath] : []),
      ...(docImportMap && docImportMap !== configPath && !/^[a-z][a-z\d+.-]*:/iu.test(docImportMap)
        ? [docImportMap]
        : []),
    ];
    formatPaths.forEach((path) => assertPathPhysicallyContained(context, manifestDirectory, path));
    const format = await runner(
      'deno',
      ['fmt', '--check', ...configArgs, ...formatPaths],
      { cwd: manifestDirectory },
      context,
    );
    if (format.code !== 0) {
      let formatPlan: Awaited<ReturnType<typeof buildFormatPlan>>;
      try {
        formatPlan = await buildFormatPlan(
          context,
          runner,
          manifestDirectory,
          configArgs,
          formatPaths,
        );
      } catch (error) {
        statuses.set('format', 'failed');
        addError(diagnostics, {
          code: 'deno.format-preview',
          message: (error as Error).message,
        });
        return buildResult();
      }
      if (formatPlan.changes.length === 0) {
        statuses.set('format', 'failed');
        recordDenoFailure(
          diagnostics,
          'deno.format',
          'Deno reported a formatting failure but did not produce a repair.',
          format,
        );
        return buildResult();
      }
      const shouldFix =
        options.fix ||
        (options.confirmFormat ? await options.confirmFormat(formatPlan.patch) : false);
      if (shouldFix) {
        try {
          await applyProjectPlan(context, {
            rootDirectory: manifestDirectory,
            changes: formatPlan.changes,
          });
        } catch (error) {
          statuses.set('format', 'failed');
          addError(diagnostics, {
            code: 'deno.format-fix',
            message: `Could not apply formatting transaction: ${(error as Error).message}`,
          });
        }
      } else {
        statuses.set('format', 'failed');
        formatPlan.changes.forEach((change, index) => {
          addError(diagnostics, {
            code: 'deno.format',
            message:
              'Referenced file is not formatted.' +
              (index === 0 && options.includeFormatPatchInDiagnostics && formatPlan.patch
                ? `\n${formatPlan.patch}`
                : ''),
            path: relativePath(manifestDirectory, change.path),
          });
        });
      }
    }
  }

  return buildResult();
}
