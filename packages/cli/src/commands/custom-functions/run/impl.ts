import { Buffer } from 'node:buffer';

import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { runCapturedProcess } from '../../../lib/cli/run-captured-process.js';
import {
  DENO_INSTALL_URL,
  getDenoRuntimeCompatibility,
  SUPPORTED_DENO_MAJOR_VERSION,
} from '../../../lib/custom-functions/deno-runtime.js';
import {
  buildLocalSimulatorInvocation,
  LOCAL_SIMULATOR_MAX_OUTPUT_BYTES,
  redactLocalSimulatorOutput,
  truncateLocalSimulatorOutput,
} from '../../../lib/custom-functions/local-simulator.js';
import {
  parseCustomFunctionsManifest,
  readCustomFunctionManifestEntry,
  type CustomFunctionManifestEntry,
} from '../../../lib/custom-functions/manifest.js';
import { formatMissingManifestMessage } from '../../../lib/custom-functions/missing-manifest.js';
import { findNonSelfContainedRuntimeImports } from '../../../lib/custom-functions/module-graph.js';
import {
  discoverCustomFunctionManifests,
  discoverCustomFunctionProject,
} from '../../../lib/custom-functions/project-discovery.js';
import {
  CustomFunctionPrompts,
  PromptCancelledError,
} from '../../../lib/custom-functions/prompts.js';
import { parseVariablesFromString } from '../../../lib/helpers/parseVariablesFromString.js';
import { assertPathPhysicallyContained } from '../../../lib/scaffolding/path-safety.js';

/** Flags accepted by `transcend custom-functions run`. */
export interface CustomFunctionRunFlags {
  /** Explicit manifest path. */
  manifest?: string;
  /** Exact function name. */
  function?: string;
  /** Manifest variable substitutions. */
  variables: string;
  /** Disable prompts. */
  noInteractive: boolean;
  /** Permit native network calls to allowed hosts. */
  allowNetwork: boolean;
}

/**
 * Select one function by exact name or ID.
 *
 * @param configs - Hydrated manifest functions
 * @param selector - Optional exact name or ID
 * @returns Selected function, or undefined when interactive selection is needed
 */
function selectNamedFunction<Config extends Pick<CustomFunctionManifestEntry, 'id' | 'name'>>(
  configs: readonly Config[],
  selector: string | undefined,
): Config | undefined {
  if (!selector) {
    return configs.length === 1 ? configs[0] : undefined;
  }
  const matches = configs.filter((config) => config.name === selector || config.id === selector);
  if (matches.length === 0) {
    throw new Error(`Custom Function "${selector}" was not found in the manifest.`);
  }
  if (matches.length > 1) {
    throw new Error(
      `Custom Function selector "${selector}" is ambiguous. Pass its manifest ID instead.`,
    );
  }
  return matches[0];
}

/**
 * Run one manifest function in the credential-free local Deno simulator.
 *
 * @param this - CLI context
 * @param flags - Selection and manifest flags
 * @param directory - Optional project directory
 */
export async function run(
  this: LocalContext,
  flags: CustomFunctionRunFlags,
  directory?: string,
): Promise<void> {
  doneInputValidation(this.process);
  try {
    const state = discoverCustomFunctionProject(this, {
      ...(directory ? { directory } : {}),
      ...(flags.manifest ? { manifest: flags.manifest } : {}),
    });
    if (!this.fs.existsSync(state.manifestPath)) {
      const cwd = this.process.cwd();
      throw new Error(
        formatMissingManifestMessage({
          cwd,
          manifestPath: state.manifestPath,
          discoveredManifestPaths: discoverCustomFunctionManifests(this, cwd),
          command: 'run',
        }),
      );
    }

    const parsedManifest = parseCustomFunctionsManifest(
      this.fs.readFileSync(state.manifestPath, 'utf8'),
      { allowExternalPaths: true },
    );
    if (parsedManifest.functions.length === 0) {
      throw new Error('The Custom Function manifest does not define any functions.');
    }
    const interactive =
      !flags.noInteractive && Boolean(this.process.stdin.isTTY && this.process.stderr.isTTY);
    let selectedEntry = selectNamedFunction(parsedManifest.functions, flags.function);
    if (!selectedEntry && interactive) {
      const prompts = new CustomFunctionPrompts(this);
      const selectedIndex = await prompts.select(
        'Custom Function to run:',
        parsedManifest.functions.map((entry, index) => ({
          name: entry.id ? `${entry.name} (${entry.id})` : entry.name,
          value: String(index),
        })),
        '0',
      );
      selectedEntry = parsedManifest.functions[Number(selectedIndex)];
    }
    if (!selectedEntry) {
      throw new Error('Select a Custom Function with --function in a non-interactive invocation.');
    }
    const { config: selected, sourcePath } = readCustomFunctionManifestEntry(
      state.manifestPath,
      selectedEntry,
      parseVariablesFromString(flags.variables),
      (path) => assertPathPhysicallyContained(this, state.manifestDirectory, path),
    );
    if (!selected.testPayloads || selected.testPayloads.length === 0) {
      throw new Error(
        `Custom Function "${selected.name}" has no test payloads. Add test-payload or test-payloads to its manifest entry.`,
      );
    }
    const denoConfig = this.fs.existsSync(state.denoConfigPath)
      ? { denoConfigPath: state.denoConfigPath }
      : {};
    const simulations = selected.testPayloads.map((testPayload) => ({
      testPayload,
      invocation: buildLocalSimulatorInvocation(selected, testPayload, {
        ...denoConfig,
        allowNetwork: flags.allowNetwork,
      }),
    }));

    const denoVersion = await runCapturedProcess(
      'deno',
      ['--version'],
      { cwd: state.manifestDirectory },
      this,
    );
    if (denoVersion.error?.code === 'ENOENT') {
      throw new Error(
        `Deno ${SUPPORTED_DENO_MAJOR_VERSION}.x is required. Install it from ${DENO_INSTALL_URL}`,
      );
    }
    if (denoVersion.code !== 0) {
      throw new Error('Deno was found, but its version could not be determined.');
    }
    const compatibility = getDenoRuntimeCompatibility(denoVersion.stdout);
    if (compatibility.level === 'error') {
      throw new Error(compatibility.message);
    }
    if (compatibility.level === 'warning') {
      this.logger.warn(compatibility.message);
    }
    const moduleGraph = await runCapturedProcess(
      'deno',
      [
        'info',
        '--json',
        ...(denoConfig.denoConfigPath
          ? [`--config=${denoConfig.denoConfigPath}`]
          : ['--no-config']),
        sourcePath,
      ],
      { cwd: state.manifestDirectory },
      this,
    );
    if (moduleGraph.code !== 0) {
      throw new Error(
        `Could not inspect Custom Function runtime imports: ${
          moduleGraph.stderr.trim() || `Deno exited with code ${moduleGraph.code}`
        }`,
      );
    }
    const unsupportedImports = findNonSelfContainedRuntimeImports(moduleGraph.stdout);
    if (unsupportedImports.length > 0) {
      throw new Error(
        `Custom Functions must be self-contained. Local or import-map runtime dependencies are not deployed: ${unsupportedImports.join(
          ', ',
        )}`,
      );
    }

    this.logger.warn(
      colors.yellow(
        'Local simulator: sdk.fetch calls are logged and return HTTP 200 without sending a request; KV state starts empty for each payload.',
      ),
    );
    if (flags.allowNetwork) {
      this.logger.warn(
        colors.yellow(
          `Network enabled: native fetch can make real requests to ${
            selected.allowedHosts?.length ? selected.allowedHosts.join(', ') : 'localhost'
          }.`,
        ),
      );
    } else if (selected.allowedHosts?.length) {
      this.logger.warn(
        colors.yellow(
          'Native network access is disabled. Pass --allowNetwork to permit calls to allowed-hosts.',
        ),
      );
    }
    let failed = false;
    for (const [index, { invocation, testPayload }] of simulations.entries()) {
      const label = testPayload.payloadType ?? `payload ${index + 1}`;
      this.logger.info(`\n${colors.bold(`Running "${selected.name}" (${label})`)}`);
      const result = await runCapturedProcess(
        'deno',
        invocation.args,
        {
          cwd: state.manifestDirectory,
          input: invocation.input,
          env: invocation.env,
          timeoutMs: invocation.timeoutMs,
          maxOutputBytes:
            LOCAL_SIMULATOR_MAX_OUTPUT_BYTES +
            Math.max(
              0,
              ...Object.values(selected.env ?? {}).map((value) => Buffer.byteLength(value)),
            ),
        },
        this,
      );
      const environment = selected.env ?? {};
      const stdout = truncateLocalSimulatorOutput(
        redactLocalSimulatorOutput(result.stdout, environment, result.stdoutTruncated),
      );
      const stderr = truncateLocalSimulatorOutput(
        redactLocalSimulatorOutput(result.stderr, environment, result.stderrTruncated),
      );
      if (stdout.output) {
        this.process.stdout.write(
          stdout.output.endsWith('\n') ? stdout.output : `${stdout.output}\n`,
        );
      }
      if (stderr.output) {
        this.process.stderr.write(
          stderr.output.endsWith('\n') ? stderr.output : `${stderr.output}\n`,
        );
      }
      if (result.outputTruncated || stdout.truncated || stderr.truncated) {
        this.logger.warn(
          colors.yellow(
            `Simulator output was truncated after ${LOCAL_SIMULATOR_MAX_OUTPUT_BYTES} bytes per stream.`,
          ),
        );
      }
      if (result.code === 0) {
        this.logger.info(colors.green(`Passed "${selected.name}" (${label})`));
      } else {
        failed = true;
        const detail = result.timedOut
          ? `timed out after ${invocation.timeoutMs}ms`
          : result.inputError
            ? `could not send the fixture to Deno: ${result.inputError.message}`
            : result.error
              ? `could not start Deno: ${result.error.message}`
              : result.signal
                ? `was terminated with ${result.signal}`
                : `exited with code ${result.code}`;
        this.logger.error(colors.red(`Failed "${selected.name}" (${label}): ${detail}`));
      }
    }
    if (failed) {
      this.process.exitCode = 1;
    }
  } catch (error) {
    if (error instanceof PromptCancelledError) {
      this.process.exit(130);
    }
    throw error;
  }
}
