import colors from 'colors';

import { version as CLI_VERSION } from '../../../constants.js';
import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import {
  runCapturedProcess,
  type CapturedProcessResult,
  type CapturedProcessRunner,
} from '../../../lib/cli/run-captured-process.js';
import {
  DEFAULT_POLICY_PROJECT_DIRECTORY,
  discoverPolicyProject,
} from '../../../lib/policy/policy-project-discovery.js';
import {
  OPA_INSTALL_URL,
  OPA_MISSING_MESSAGE,
  parsePolicyToolVersion,
  MINIMUM_POLICY_STARTER_REGAL_VERSION,
  REGAL_INSTALL_URL,
  REGAL_MISSING_MESSAGE,
  unsupportedOpaVersionMessage,
  unsupportedRegalVersionMessage,
} from '../../../lib/policy/policy-runtime.js';
import {
  PolicySetupFeature,
  type PolicySetupFeature as PolicySetupFeatureType,
} from '../../../lib/policy/policy-scaffold-model.js';
import {
  buildPolicyInitAiHandoff,
  buildPolicyInitPlanResult,
  type PolicyInitToolVersions,
} from '../../../lib/policy/policy-scaffold-output.js';
import {
  buildPolicyInitPlan,
  getPolicyInitPlanningCandidatePaths,
} from '../../../lib/policy/policy-scaffold-planning.js';
import { collectPlanningSnapshots } from '../../../lib/scaffolding/project-discovery.js';
import { applyProjectPlan } from '../../../lib/scaffolding/project-plan-apply.js';
import {
  displayProjectPath,
  quoteShellArgument,
  renderProjectPlan,
} from '../../../lib/scaffolding/project-plan-output.js';
import {
  PromptCancelledError,
  type PromptChoice,
  ScaffoldPrompts,
} from '../../../lib/scaffolding/prompts.js';

/** Flags for `transcend policy init`. */
export interface PolicyInitFlags {
  /** Install repository-level VS Code setup. */
  editor?: boolean;
  /** Install the Policy Engine Agent Skill. */
  skill?: boolean;
  /** Install validation-only GitHub Actions CI. */
  ci?: boolean;
  /** Disable prompts. */
  noInteractive: boolean;
  /** Render but do not apply the plan. */
  dryRun: boolean;
  /** Approve the final displayed plan. */
  yes: boolean;
  /** Emit one stable JSON result on stdout. */
  json: boolean;
}

/** User-facing optional setup labels. */
const SETUP_LABELS: Readonly<Record<PolicySetupFeatureType, string>> = {
  [PolicySetupFeature.Editor]: 'VS Code settings and lint task',
  [PolicySetupFeature.Skill]: 'Policy Engine Agent Skill',
  [PolicySetupFeature.Ci]: 'Validation-only GitHub Actions',
};

/** All optional setup features in stable prompt order. */
const ALL_SETUP_FEATURES = Object.values(PolicySetupFeature);

/** Runtime compatibility detected before policy planning. */
interface PolicyRuntimeProbe {
  /** Compatible tool versions. */
  tools: PolicyInitToolVersions;
  /** Missing or incompatible runtime guidance. */
  warnings: string[];
}

/**
 * Whether this invocation can ask questions.
 *
 * @param flags - Interaction flags
 * @param stdinIsTTY - Whether standard input is interactive
 * @param stderrIsTTY - Whether prompt output is interactive
 * @returns Whether prompts are enabled
 */
function isInteractiveInvocation(
  flags: Pick<PolicyInitFlags, 'json' | 'noInteractive'>,
  stdinIsTTY: boolean | undefined,
  stderrIsTTY: boolean | undefined,
): boolean {
  return !flags.json && !flags.noInteractive && Boolean(stdinIsTTY && stderrIsTTY);
}

/**
 * Resolve setup from explicit flags or one default-selected checklist.
 *
 * @param prompts - Prompt adapters
 * @param flags - Setup flags
 * @param options - Interaction state
 * @returns Explicitly selected setup features
 */
async function resolveFeatures(
  prompts: ScaffoldPrompts,
  flags: PolicyInitFlags,
  options: {
    /** Whether prompts are available. */
    interactive: boolean;
  },
): Promise<PolicySetupFeatureType[]> {
  const enabled: Readonly<Record<PolicySetupFeatureType, boolean | undefined>> = {
    [PolicySetupFeature.Editor]: flags.editor,
    [PolicySetupFeature.Skill]: flags.skill,
    [PolicySetupFeature.Ci]: flags.ci,
  };
  if (!options.interactive) {
    return ALL_SETUP_FEATURES.filter((feature) => enabled[feature] === true);
  }
  const choices: PromptChoice<PolicySetupFeatureType>[] = ALL_SETUP_FEATURES.map((feature) => ({
    name: SETUP_LABELS[feature],
    value: feature,
    checked: enabled[feature] !== false,
  }));
  return prompts.checkbox('Choose repository setup:', choices);
}

/**
 * Explain a failed version subprocess with official installation guidance.
 *
 * @param tool - Policy tool name
 * @param result - Failed captured process
 * @returns Actionable warning
 */
function failedVersionProbeMessage(tool: 'OPA' | 'Regal', result: CapturedProcessResult): string {
  const detail = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join('\n');
  const url = tool === 'OPA' ? OPA_INSTALL_URL : REGAL_INSTALL_URL;
  const requirement =
    tool === 'OPA' ? 'OPA 1.x' : `Regal ${MINIMUM_POLICY_STARTER_REGAL_VERSION} or newer`;
  return (
    `${requirement} is required, but \`${tool.toLowerCase()} version\` exited with code ` +
    `${result.code}${detail ? `: ${detail}` : '.'} ` +
    `Install or upgrade it using the official instructions: ${url}`
  );
}

/**
 * Probe both local policy runtimes without installing or modifying them.
 *
 * @param context - CLI context
 * @param cwd - Invocation working directory
 * @param runner - Captured subprocess runner
 * @returns Compatible versions and exact runtime guidance
 */
async function probePolicyRuntimes(
  context: LocalContext,
  cwd: string,
  runner: CapturedProcessRunner,
): Promise<PolicyRuntimeProbe> {
  const tools: PolicyInitToolVersions = { opa: null, regal: null };
  const warnings: string[] = [];

  const opaResult = await runner('opa', ['version'], { cwd }, context);
  if (opaResult.error?.code === 'ENOENT') {
    warnings.push(OPA_MISSING_MESSAGE);
  } else {
    const output = `${opaResult.stdout}\n${opaResult.stderr}`;
    const unsupported = unsupportedOpaVersionMessage(output);
    if (opaResult.code !== 0) {
      warnings.push(unsupported ?? failedVersionProbeMessage('OPA', opaResult));
    } else if (unsupported) {
      warnings.push(unsupported);
    } else {
      tools.opa = parsePolicyToolVersion(output)!.version;
    }
  }

  const regalResult = await runner('regal', ['version'], { cwd }, context);
  if (regalResult.error?.code === 'ENOENT') {
    warnings.push(REGAL_MISSING_MESSAGE);
  } else {
    const output = `${regalResult.stdout}\n${regalResult.stderr}`;
    const unsupported = unsupportedRegalVersionMessage(
      output,
      MINIMUM_POLICY_STARTER_REGAL_VERSION,
      'the generated OPA 1.13.1 capabilities configuration',
    );
    if (regalResult.code !== 0) {
      warnings.push(unsupported ?? failedVersionProbeMessage('Regal', regalResult));
    } else if (unsupported) {
      warnings.push(unsupported);
    } else {
      tools.regal = parsePolicyToolVersion(output)!.version;
    }
  }

  return { tools, warnings };
}

/**
 * Initialize a credential-free local Policy Engine project.
 *
 * @param this - CLI context
 * @param flags - Scaffold and interaction flags
 * @param directory - Target policy directory
 * @param runner - Captured policy tool runner
 */
export async function init(
  this: LocalContext,
  flags: PolicyInitFlags,
  directory: string = DEFAULT_POLICY_PROJECT_DIRECTORY,
  runner: CapturedProcessRunner = runCapturedProcess,
): Promise<void> {
  doneInputValidation(this.process);
  try {
    const runtime = await probePolicyRuntimes(this, this.process.cwd(), runner);
    const state = discoverPolicyProject(this, directory);
    const prompts = new ScaffoldPrompts(this);
    const interactive = isInteractiveInvocation(
      flags,
      this.process.stdin.isTTY,
      this.process.stderr.isTTY,
    );
    const features = await resolveFeatures(prompts, flags, { interactive });
    const candidatePaths = getPolicyInitPlanningCandidatePaths(state, { features });
    const snapshots = collectPlanningSnapshots(this, state.projectRoot, candidatePaths);

    const plan = buildPolicyInitPlan(
      { state, snapshots },
      {
        features,
        cliVersion: CLI_VERSION,
      },
    );
    plan.warnings.push(...runtime.warnings);

    if (!flags.json) {
      this.logger.info(
        renderProjectPlan(plan, {
          cwd: this.process.cwd(),
          title: 'Policy initialization plan',
          details: [
            { label: 'Target', path: plan.targetDirectory },
            { label: 'Manifest', path: plan.manifestPath },
          ],
        }),
      );
    }

    let approved = plan.changes.length === 0 || flags.dryRun;
    if (plan.changes.length > 0 && !flags.dryRun) {
      if (flags.yes) {
        approved = true;
      } else if (interactive) {
        approved = await prompts.confirm('Apply this complete plan?', true);
      } else {
        throw new Error(
          'The plan requires approval in a non-interactive invocation. Review with --dryRun, then pass --yes.',
        );
      }
    }

    if (approved && !flags.dryRun && plan.changes.length > 0) {
      await applyProjectPlan(this, plan);
    }
    const applied = approved && !flags.dryRun && plan.changes.length > 0;
    const aiHandoff = buildPolicyInitAiHandoff({
      projectPath: quoteShellArgument(
        displayProjectPath(this.process.cwd(), state.targetDirectory),
      ),
      ...(plan.disposableExamplePath
        ? {
            examplePath: quoteShellArgument(
              displayProjectPath(this.process.cwd(), plan.disposableExamplePath),
            ),
          }
        : {}),
      lintCommand: plan.nextSteps[0]!,
    });
    const result = buildPolicyInitPlanResult(plan, {
      applied,
      dryRun: flags.dryRun,
      cwd: this.process.cwd(),
      aiHandoff,
      tools: runtime.tools,
    });
    if (flags.json) {
      this.process.stdout.write(`${JSON.stringify(result)}\n`);
      return;
    }
    if (flags.dryRun) {
      this.logger.info(colors.yellow('Dry run complete. No changes were written.'));
      return;
    }
    if (!approved) {
      this.logger.info(colors.yellow('No changes applied.'));
      return;
    }
    if (plan.changes.length === 0) {
      const message =
        plan.warnings.length === runtime.warnings.length
          ? 'Policy project is already initialized.'
          : 'Existing policy project was left unchanged.';
      this.logger.info(colors.green(message));
    } else {
      this.logger.info(colors.green('Policy project initialized.'));
    }
    if (plan.nextSteps.length > 0) {
      this.logger.info(`\n${colors.bold('Next steps')}`);
      plan.nextSteps.forEach((step) => this.logger.info(step));
    }
    this.logger.info(`\n${colors.bold('AI handoff — paste into your coding agent')}`);
    this.logger.info(aiHandoff);
  } catch (error) {
    if (error instanceof PromptCancelledError) {
      return this.process.exit(130);
    }
    throw error;
  }
}
