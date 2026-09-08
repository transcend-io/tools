import { CUSTOM_FUNCTION_TYPES_VERSION } from '@transcend-io/custom-function-types';

import { version as CLI_VERSION } from '../../../constants.js';
import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { runCapturedProcess } from '../../../lib/cli/run-captured-process.js';
import { buildInitAiHandoff } from '../../../lib/custom-functions/ai-handoff.js';
import {
  DENO_INSTALL_URL,
  unsupportedDenoVersionMessage,
} from '../../../lib/custom-functions/deno-runtime.js';
import {
  collectPlanningSnapshots,
  discoverCustomFunctionProject,
} from '../../../lib/custom-functions/project-discovery.js';
import {
  CustomFunctionPrompts,
  PromptCancelledError,
  type PromptChoice,
} from '../../../lib/custom-functions/prompts.js';
import {
  CustomFunctionSetupFeature,
  type CustomFunctionSetupFeature as CustomFunctionSetupFeatureType,
} from '../../../lib/custom-functions/scaffold-model.js';
import {
  buildPlanResult,
  displayPath,
  renderProjectPlan,
} from '../../../lib/custom-functions/scaffold-output.js';
import {
  buildInitPlan,
  getInitPlanningCandidatePaths,
} from '../../../lib/custom-functions/scaffold-planning.js';
import { applyProjectPlan } from '../../../lib/scaffolding/project-plan-apply.js';

/** Flags for `custom-functions init`. */
export interface CustomFunctionInitFlags {
  /** Explicit manifest path. */
  manifest?: string;
  /** Install Deno configuration. */
  deno?: boolean;
  /** Install editor recommendations. */
  editor?: boolean;
  /** Install the coding-agent skill. */
  skill?: boolean;
  /** Install GitHub Actions validation. */
  ci?: boolean;
  /** Disable prompts. */
  noInteractive: boolean;
  /** Render but do not apply. */
  dryRun: boolean;
  /** Approve the final displayed plan. */
  yes: boolean;
  /** Emit one stable JSON result on stdout. */
  json: boolean;
}

/** User-facing setup labels. */
const SETUP_LABELS: Readonly<Record<CustomFunctionSetupFeatureType, string>> = {
  [CustomFunctionSetupFeature.Deno]: 'Deno configuration',
  [CustomFunctionSetupFeature.Editor]: 'VS Code settings',
  [CustomFunctionSetupFeature.Skill]: 'Agent skill',
  [CustomFunctionSetupFeature.Ci]: 'GitHub Actions',
};

/** All optional setup features in stable prompt order. */
const ALL_SETUP_FEATURES = Object.values(CustomFunctionSetupFeature);

/**
 * Whether this invocation can ask questions.
 *
 * @param context - CLI context
 * @param flags - Interaction flags
 * @returns Whether prompts are enabled
 */
function isInteractiveInvocation(
  flags: Pick<CustomFunctionInitFlags, 'json' | 'noInteractive'>,
  stdinIsTTY: boolean | undefined,
  stderrIsTTY: boolean | undefined,
): boolean {
  return !flags.json && !flags.noInteractive && Boolean(stdinIsTTY && stderrIsTTY);
}

/**
 * Resolve setup directly from individual flags or one checkbox prompt.
 *
 * @param context - CLI context
 * @param prompts - Prompt adapters
 * @param flags - Setup flags
 * @param options - Interaction state
 * @returns Selected setup features
 */
async function resolveFeatures(
  prompts: CustomFunctionPrompts,
  flags: CustomFunctionInitFlags,
  options: {
    /** Whether prompts are available. */
    interactive: boolean;
  },
): Promise<CustomFunctionSetupFeatureType[]> {
  const enabled: Readonly<Record<CustomFunctionSetupFeatureType, boolean | undefined>> = {
    [CustomFunctionSetupFeature.Deno]: flags.deno,
    [CustomFunctionSetupFeature.Editor]: flags.editor,
    [CustomFunctionSetupFeature.Skill]: flags.skill,
    [CustomFunctionSetupFeature.Ci]: flags.ci,
  };
  if (!options.interactive) {
    return ALL_SETUP_FEATURES.filter((feature) => enabled[feature] === true);
  }
  const choices: PromptChoice<CustomFunctionSetupFeatureType>[] = ALL_SETUP_FEATURES.map(
    (feature) => ({
      name: SETUP_LABELS[feature],
      value: feature,
      checked: enabled[feature] !== false,
    }),
  );
  return prompts.checkbox('Choose repository setup:', choices);
}

/**
 * Initialize a credential-free local Custom Function project.
 *
 * @param this - CLI context
 * @param flags - Scaffold and interaction flags
 * @param directory - Optional target directory
 */
export async function init(
  this: LocalContext,
  flags: CustomFunctionInitFlags,
  directory?: string,
): Promise<void> {
  doneInputValidation(this.process);
  try {
    const state = discoverCustomFunctionProject(this, {
      ...(directory ? { directory } : {}),
      ...(flags.manifest ? { manifest: flags.manifest } : {}),
    });
    const prompts = new CustomFunctionPrompts(this);
    const interactive = isInteractiveInvocation(
      flags,
      this.process.stdin.isTTY,
      this.process.stderr.isTTY,
    );
    const features = await resolveFeatures(prompts, flags, { interactive });
    const snapshots = collectPlanningSnapshots(
      this,
      getInitPlanningCandidatePaths(state, { features }),
    );
    const plan = buildInitPlan(
      {
        state,
        snapshots,
        contractVersion: CUSTOM_FUNCTION_TYPES_VERSION,
        cliVersion: CLI_VERSION,
      },
      { features },
    );
    if (features.includes(CustomFunctionSetupFeature.Deno)) {
      const denoVersion = await runCapturedProcess(
        'deno',
        ['--version'],
        { cwd: this.process.cwd() },
        this,
      );
      if (denoVersion.error?.code === 'ENOENT') {
        plan.warnings.push(`Deno 2.x is not installed. Install it from ${DENO_INSTALL_URL}`);
      } else if (denoVersion.code !== 0) {
        plan.warnings.push(
          `Deno was found, but its version could not be determined. Deno 2.x is required. See ${DENO_INSTALL_URL}`,
        );
      } else {
        const unsupportedVersion = unsupportedDenoVersionMessage(denoVersion.stdout);
        if (unsupportedVersion) {
          plan.warnings.push(unsupportedVersion);
        }
      }
    }
    if (!flags.json) {
      this.logger.info(renderProjectPlan(plan, this.process.cwd()));
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
    const aiHandoff = buildInitAiHandoff({
      targetDirectory: displayPath(this.process.cwd(), state.targetDirectory),
      manifestPath: displayPath(this.process.cwd(), state.manifestPath),
      cliVersion: CLI_VERSION,
      hasSkill: features.includes(CustomFunctionSetupFeature.Skill),
      hasGithubWorkflow:
        features.includes(CustomFunctionSetupFeature.Ci) &&
        Boolean(state.repositoryRoot && state.usesGithub),
    });
    const result = buildPlanResult(plan, {
      applied,
      dryRun: flags.dryRun,
      cwd: this.process.cwd(),
      aiHandoff,
    });
    if (flags.json) {
      this.process.stdout.write(`${JSON.stringify(result)}\n`);
      return;
    }
    if (flags.dryRun) {
      this.logger.info('Dry run complete. No changes were written.');
      return;
    }
    if (!approved) {
      this.logger.info('No changes applied.');
      return;
    }
    if (plan.changes.length === 0) {
      this.logger.info('Custom Function project is already initialized.');
      return;
    }
    this.logger.info('Custom Function project initialized.');
    if (plan.nextSteps.length > 0) {
      this.logger.info('\nNext steps');
      plan.nextSteps.forEach((step, index) => {
        this.logger.info(`  ${index + 1}. ${step}`);
      });
    }
    this.logger.info('\nAI handoff — paste into your coding agent');
    this.logger.info(aiHandoff);
  } catch (error) {
    if (error instanceof PromptCancelledError) {
      this.process.exit(130);
    }
    throw error;
  }
}
