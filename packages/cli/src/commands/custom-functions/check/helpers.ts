import { spawn } from 'node:child_process';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';

import {
  DSR_DATAPOINT_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
  DSR_REQUEST_ENRICHER_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
  GENERAL_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
} from '@transcend-io/custom-function-types';
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import { createTwoFilesPatch } from 'diff';

import type { LocalContext } from '../../../context.js';
import {
  type CustomFunctionCheckResult,
  type CustomFunctionCheckStatus,
  type CustomFunctionDiagnostic,
} from '../../../lib/custom-functions/check-model.js';
import {
  isCustomFunctionManifestPathContained,
  parseCustomFunctionsManifest,
  type CustomFunctionManifestEntry,
} from '../../../lib/custom-functions/manifest.js';
import { CUSTOM_FUNCTION_RESULT_VERSION } from '../../../lib/custom-functions/scaffold-model.js';

/** Captured process result. */
export interface CapturedProcessResult {
  /** Process exit code. */
  code: number;
  /** Captured standard output. */
  stdout: string;
  /** Captured standard error. */
  stderr: string;
  /** Spawn error, when the executable did not start. */
  error?: NodeJS.ErrnoException;
}

/** Captured process runner. */
export type CapturedProcessRunner = (
  command: string,
  args: readonly string[],
  options: {
    /** Working directory. */
    cwd: string;
    /** Optional standard input. */
    input?: string;
  },
  context: LocalContext,
) => Promise<CapturedProcessResult>;

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
}

/** Options for local validation. */
export interface RunCustomFunctionChecksOptions {
  /** Absolute manifest path. */
  manifestPath: string;
  /** Apply Deno formatting. */
  fix: boolean;
  /** Ask for an interactive formatting repair after receiving a patch. */
  confirmFormat?: (patch: string) => Promise<boolean>;
}

/**
 * Capture a subprocess without forwarding user module output.
 *
 * @param command - Executable
 * @param args - Arguments
 * @param options - CWD and optional standard input
 * @param context - CLI context
 * @returns Captured result
 */
export const runCapturedProcess: CapturedProcessRunner = (command, args, options, context) =>
  new Promise((resolveResult) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      env: { ...context.process.env, NO_COLOR: '1' },
      stdio: 'pipe',
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('error', (error: NodeJS.ErrnoException) => {
      resolveResult({ code: 1, stdout, stderr, error });
    });
    child.once('close', (code) => {
      resolveResult({ code: code ?? 1, stdout, stderr });
    });
    if (options.input === undefined) {
      child.stdin.end();
    } else {
      child.stdin.end(options.input);
    }
  });

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
    needsDefault:
      entry.type !== 'DSR' || dsrWithoutPayloads || payloadTypes.includes('dsr-datapoint'),
    needsEnricher: payloadTypes.includes('dsr-enricher'),
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
    const names = new Set<string>();
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (value && typeof value === 'object') {
        const object = value as Record<string, unknown>;
        if (typeof object.name === 'string') {
          names.add(object.name);
        }
        Object.values(object).forEach(visit);
      }
    };
    visit(document);
    return names;
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
 * Render deterministic formatter patches without changing files.
 *
 * @param context - CLI context
 * @param runner - Process runner
 * @param manifestDirectory - Working directory
 * @param configArgs - Deno config arguments
 * @param paths - Target files
 * @returns Unified patches
 */
async function buildFormatPatches(
  context: LocalContext,
  runner: CapturedProcessRunner,
  manifestDirectory: string,
  configArgs: readonly string[],
  paths: readonly string[],
): Promise<string> {
  const patches: string[] = [];
  for (const path of paths) {
    const before = context.fs.readFileSync(path, 'utf8');
    const result = await runner(
      'deno',
      ['fmt', ...configArgs, `--ext=${denoExtension(path)}`, '-'],
      { cwd: manifestDirectory, input: before },
      context,
    );
    if (result.code === 0 && result.stdout !== before) {
      const display = relativePath(manifestDirectory, path);
      patches.push(
        createTwoFilesPatch(display, display, before, result.stdout, '', '', { context: 3 }),
      );
    }
  }
  return patches.join('\n');
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
    ['exports', 'passed'],
    ['typecheck', 'passed'],
    ['lint', 'passed'],
    ['format', 'passed'],
  ]);
  if (!context.fs.existsSync(manifestPath)) {
    addError(diagnostics, {
      code: 'manifest.missing',
      message: 'Custom Function manifest does not exist.',
      path: relativePath(context.process.cwd(), manifestPath),
    });
    statuses.set('manifest', 'failed');
    ['files', 'payloads', 'exports', 'typecheck', 'lint', 'format'].forEach((name) =>
      statuses.set(name, 'skipped'),
    );
    return {
      version: CUSTOM_FUNCTION_RESULT_VERSION,
      status: 'failed',
      manifestPath,
      checks: [...statuses].map(([name, status]) => ({ name, status })),
      diagnostics,
    };
  }

  let entries: readonly CustomFunctionManifestEntry[] = [];
  try {
    entries = parseCustomFunctionsManifest(context.fs.readFileSync(manifestPath, 'utf8')).functions;
  } catch (error) {
    addError(diagnostics, {
      code: 'manifest.invalid',
      message: (error as Error).message,
      path: relativePath(manifestDirectory, manifestPath),
    });
    statuses.set('manifest', 'failed');
    ['files', 'payloads', 'exports', 'typecheck', 'lint'].forEach((name) =>
      statuses.set(name, 'skipped'),
    );
  }

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
  }
  if (
    diagnostics.some(({ code }) =>
      ['payload.', 'manifest.unresolved-payload-path'].some((prefix) => code.startsWith(prefix)),
    )
  ) {
    statuses.set('payloads', 'failed');
  }

  const denoVersion = await runner('deno', ['--version'], { cwd: manifestDirectory }, context);
  if (denoVersion.error?.code === 'ENOENT') {
    ['exports', 'typecheck', 'lint', 'format'].forEach((name) => statuses.set(name, 'skipped'));
    addError(diagnostics, {
      code: 'deno.missing',
      message:
        'Deno is required for export, type, lint, and format checks. Install it from https://docs.deno.com/runtime/getting_started/installation/',
    });
  } else if (denoVersion.code !== 0) {
    ['exports', 'typecheck', 'lint', 'format'].forEach((name) => statuses.set(name, 'skipped'));
    recordDenoFailure(diagnostics, 'deno.unavailable', 'Deno could not be started.', denoVersion);
  } else {
    for (const source of sources) {
      const result = await runner(
        'deno',
        ['doc', '--json', source.path],
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
    }

    const denoJsonc = join(manifestDirectory, 'deno.jsonc');
    const denoJson = join(manifestDirectory, 'deno.json');
    const configPath = context.fs.existsSync(denoJsonc)
      ? denoJsonc
      : context.fs.existsSync(denoJson)
        ? denoJson
        : undefined;
    const configArgs = configPath ? [`--config=${configPath}`] : ['--no-config'];
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
    ];
    const format = await runner(
      'deno',
      ['fmt', '--check', ...configArgs, ...formatPaths],
      { cwd: manifestDirectory },
      context,
    );
    if (format.code !== 0) {
      const patch = await buildFormatPatches(
        context,
        runner,
        manifestDirectory,
        configArgs,
        formatPaths,
      );
      const shouldFix =
        options.fix || (options.confirmFormat ? await options.confirmFormat(patch) : false);
      if (shouldFix) {
        const repair = await runner(
          'deno',
          ['fmt', ...configArgs, ...formatPaths],
          { cwd: manifestDirectory },
          context,
        );
        if (repair.code !== 0) {
          statuses.set('format', 'failed');
          recordDenoFailure(
            diagnostics,
            'deno.format-fix',
            'Deno could not format the referenced files.',
            repair,
          );
        }
      } else {
        statuses.set('format', 'failed');
        addError(diagnostics, {
          code: 'deno.format',
          message: `Referenced files are not formatted.${patch ? `\n${patch}` : ''}`,
        });
      }
    }
  }

  return {
    version: CUSTOM_FUNCTION_RESULT_VERSION,
    status: diagnostics.some(({ severity }) => severity === 'error') ? 'failed' : 'passed',
    manifestPath,
    checks: [...statuses].map(([name, status]) => ({ name, status })),
    diagnostics,
  };
}
