import { CUSTOM_FUNCTION_TYPES_VERSION } from '@transcend-io/custom-function-types';

import { version as CLI_VERSION } from '../../../constants.js';
import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import {
  collectPlanningSnapshots,
  discoverCustomFunctionProject,
} from '../../../lib/custom-functions/project-discovery.js';
import { applyCustomFunctionProjectPlan } from '../../../lib/custom-functions/project-plan-apply.js';
import {
  CustomFunctionPrompts,
  PromptCancelledError,
  type PromptChoice,
} from '../../../lib/custom-functions/prompts.js';
import {
  ALL_SETUP_FEATURES,
  applySetupFeatureOverrides,
  resolveSetupFeatures,
} from '../../../lib/custom-functions/scaffold-config.js';
import {
  CustomFunctionSetupFeature,
  type CustomFunctionSetup,
  type CustomFunctionSetupFeature as CustomFunctionSetupFeatureType,
} from '../../../lib/custom-functions/scaffold-model.js';
import {
  buildPlanResult,
  renderProjectPlan,
} from '../../../lib/custom-functions/scaffold-output.js';
import {
  buildInitPlan,
  getInitPlanningCandidatePaths,
} from '../../../lib/custom-functions/scaffold-planning.js';

/** Flags for `custom-functions init`. */
export interface CustomFunctionInitFlags {
  /** Explicit manifest path. */
  manifest?: string;
  /** Setup preset. */
  setup?: CustomFunctionSetup;
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
  [CustomFunctionSetupFeature.Deno]: 'Deno imports, strict settings, and check task',
  [CustomFunctionSetupFeature.Editor]: 'VS Code-compatible Deno recommendations',
  [CustomFunctionSetupFeature.Skill]: 'Transcend Custom Function coding-agent skill',
  [CustomFunctionSetupFeature.Ci]: 'Credential-free GitHub Actions checks',
};

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
 * Resolve explicit per-feature flags.
 *
 * @param flags - CLI flags
 * @returns Explicit overrides only
 */
function setupOverrides(
  flags: CustomFunctionInitFlags,
): Partial<Record<CustomFunctionSetupFeatureType, boolean>> {
  return {
    ...(flags.deno === undefined ? {} : { [CustomFunctionSetupFeature.Deno]: flags.deno }),
    ...(flags.editor === undefined ? {} : { [CustomFunctionSetupFeature.Editor]: flags.editor }),
    ...(flags.skill === undefined ? {} : { [CustomFunctionSetupFeature.Skill]: flags.skill }),
    ...(flags.ci === undefined ? {} : { [CustomFunctionSetupFeature.Ci]: flags.ci }),
  };
}

/**
 * Resolve setup from flags or one checkbox prompt.
 *
 * @param context - CLI context
 * @param prompts - Prompt adapters
 * @param flags - Setup flags
 * @param options - Project state relevant to setup defaults
 * @returns Selected setup features
 */
async function resolveFeatures(
  prompts: CustomFunctionPrompts,
  flags: CustomFunctionInitFlags,
  options: {
    /** Whether prompts are available. */
    interactive: boolean;
    /** Whether a project-level skill directory exists. */
    hasProjectSkillDirectory: boolean;
    /** Whether GitHub Actions is applicable. */
    usesGithub: boolean;
  },
): Promise<CustomFunctionSetupFeatureType[]> {
  let features: CustomFunctionSetupFeatureType[];
  if (flags.setup) {
    features = resolveSetupFeatures(flags.setup, {
      hasProjectSkillDirectory: options.interactive && options.hasProjectSkillDirectory,
    });
  } else {
    if (!options.interactive) {
      throw new Error(
        'Missing setup choice in a non-interactive invocation. Pass --setup=none, --setup=recommended, or --setup=all.',
      );
    }
    const recommended = new Set(
      resolveSetupFeatures('recommended', {
        hasProjectSkillDirectory: options.hasProjectSkillDirectory,
      }),
    );
    const choices: PromptChoice<CustomFunctionSetupFeatureType>[] = ALL_SETUP_FEATURES.map(
      (feature) => ({
        name: SETUP_LABELS[feature],
        value: feature,
        checked:
          recommended.has(feature) ||
          (feature === CustomFunctionSetupFeature.Ci && options.usesGithub),
      }),
    );
    features = await prompts.checkbox('Choose optional repository setup:', choices);
  }
  return applySetupFeatureOverrides(features, setupOverrides(flags));
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
    const features = await resolveFeatures(prompts, flags, {
      interactive,
      hasProjectSkillDirectory: state.existingSkillDirectories.length > 0,
      usesGithub: state.usesGithub,
    });
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
      await applyCustomFunctionProjectPlan(this, plan);
    }
    const applied = approved && !flags.dryRun && plan.changes.length > 0;
    const result = buildPlanResult(plan, {
      applied,
      dryRun: flags.dryRun,
      cwd: this.process.cwd(),
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
      this.logger.info('\nNext steps:');
      plan.nextSteps.forEach((step, index) => {
        this.logger.info(`  ${index + 1}. ${step}`);
      });
    }
  } catch (error) {
    if (error instanceof PromptCancelledError) {
      this.process.exit(130);
    }
    throw error;
  }
}
