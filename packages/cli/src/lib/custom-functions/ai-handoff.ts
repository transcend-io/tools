import { CUSTOM_FUNCTION_SKILL_NAME } from './custom-function-skill.js';
import { SUPPORTED_DENO_VERSION } from './deno-runtime.js';
import { buildCustomFunctionProjectArguments, quoteCliArgument } from './paths.js';

/**
 * Build a compact AI handoff after project initialization.
 *
 * @param options - Generated setup context
 * @returns Copyable agent instruction
 */
export function buildInitAiHandoff(options: {
  /** Display path to the Custom Function project. */
  targetDirectory: string;
  /** Display path to the manifest. */
  manifestPath: string;
  /** Exact CLI version used by generated CI. */
  cliVersion: string;
  /** Whether the authoring skill was installed. */
  hasSkill: boolean;
  /** Whether a GitHub Actions workflow was generated. */
  hasGithubWorkflow: boolean;
}): string {
  const prefix = options.hasSkill
    ? `Use the \`${CUSTOM_FUNCTION_SKILL_NAME}\` skill to`
    : 'Ask your coding agent to';
  const checkCommand = `transcend custom-functions check ${buildCustomFunctionProjectArguments(
    options.targetDirectory,
    options.manifestPath,
  )} --noInteractive`;
  if (options.hasGithubWorkflow) {
    return `${prefix} review the Custom Function setup in \`${options.targetDirectory}\`, adapt the generated GitHub Actions workflow to this repository's conventions, and run \`${checkCommand}\`.`;
  }
  return `${prefix} review the Custom Function setup in \`${options.targetDirectory}\` and add equivalent CI for this repository: install Deno ${SUPPORTED_DENO_VERSION} and \`@transcend-io/cli@${options.cliVersion}\`, then run \`${checkCommand}\`.`;
}

/**
 * Build a compact AI handoff after adding one function.
 *
 * @param options - Generated function context
 * @returns Copyable agent instruction
 */
export function buildNewFunctionAiHandoff(options: {
  /** Customer-visible function name. */
  displayName: string;
  /** Display path to the generated source. */
  sourcePath: string;
  /** Display path to the Custom Function project. */
  targetDirectory: string;
  /** Display path to the selected manifest. */
  manifestPath: string;
  /** Whether the authoring skill is expected in this project. */
  hasSkill: boolean;
}): string {
  const prefix = options.hasSkill
    ? `Use the \`${CUSTOM_FUNCTION_SKILL_NAME}\` skill to`
    : 'Ask your coding agent to';
  const checkCommand = `transcend custom-functions check ${buildCustomFunctionProjectArguments(
    options.targetDirectory,
    options.manifestPath,
  )}`;
  const runCommand =
    `transcend custom-functions run ` +
    `${buildCustomFunctionProjectArguments(options.targetDirectory, options.manifestPath)} ` +
    `--function=${quoteCliArgument(options.displayName)}`;
  return `${prefix} implement \`${options.displayName}\` in \`${options.sourcePath}\`, replace the example fixtures with realistic cases, run \`${runCommand}\` to exercise it locally, and finish with \`${checkCommand}\`.`;
}
