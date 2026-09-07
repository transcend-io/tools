import { CUSTOM_FUNCTION_TYPES_VERSION } from '@transcend-io/custom-function-types';

import { version as CLI_VERSION } from '../../../constants.js';
import type { LocalContext } from '../../../context.js';
import { applyCustomFunctionProjectPlan } from './apply.js';
import { ALL_SETUP_FEATURES, applySetupFeatureOverrides, resolveSetupFeatures } from './config.js';
import { discoverCustomFunctionProject } from './discovery.js';
import {
  CustomFunctionSetupFeature,
  type CustomFunctionProjectPlan,
  type CustomFunctionSetup,
  type CustomFunctionSetupFeature as CustomFunctionSetupFeatureType,
} from './model.js';
import { buildPlanResult, renderProjectPlan } from './output.js';
import {
  buildInitPlan,
  buildNewPlan,
  collectPlanningSnapshots,
  getPlanningCandidatePaths,
  prepareGeneratedCustomFunction,
} from './planning.js';
import { CustomFunctionPrompts, type PromptChoice } from './prompts.js';
import { CUSTOM_FUNCTION_TEMPLATE_NAMES, type CustomFunctionTemplateName } from './templates.js';

/** Common flags for local scaffold commands. */
export interface CustomFunctionScaffoldFlags {
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
  /** Install secret-name documentation. */
  secretDocs?: boolean;
  /** Disable prompts. */
  noInteractive: boolean;
  /** Render but do not apply. */
  dryRun: boolean;
  /** Approve the final displayed plan. */
  yes: boolean;
  /** Emit one stable JSON result on stdout. */
  json: boolean;
}

/** Flags specific to `custom-functions new`. */
export interface CustomFunctionNewFlags extends CustomFunctionScaffoldFlags {
  /** Custom Function display name. */
  name?: string;
  /** Starter handler shape. */
  template?: CustomFunctionTemplateName;
}

/**
 * Whether this invocation can ask questions.
 *
 * @param context - CLI context
 * @param flags - Interaction flags
 * @returns Whether prompts are enabled
 */
export function isInteractiveInvocation(
  context: LocalContext,
  flags: Pick<CustomFunctionScaffoldFlags, 'json' | 'noInteractive'>,
): boolean {
  return (
    !flags.json &&
    !flags.noInteractive &&
    Boolean(context.process.stdin.isTTY && context.process.stderr.isTTY)
  );
}

/**
 * Resolve explicit per-feature flags.
 *
 * @param flags - CLI flags
 * @returns Explicit overrides only
 */
function setupOverrides(
  flags: CustomFunctionScaffoldFlags,
): Partial<Record<CustomFunctionSetupFeatureType, boolean>> {
  return {
    ...(flags.deno === undefined ? {} : { [CustomFunctionSetupFeature.Deno]: flags.deno }),
    ...(flags.editor === undefined ? {} : { [CustomFunctionSetupFeature.Editor]: flags.editor }),
    ...(flags.skill === undefined ? {} : { [CustomFunctionSetupFeature.Skill]: flags.skill }),
    ...(flags.ci === undefined ? {} : { [CustomFunctionSetupFeature.Ci]: flags.ci }),
    ...(flags.secretDocs === undefined
      ? {}
      : { [CustomFunctionSetupFeature.SecretDocs]: flags.secretDocs }),
  };
}

/** User-facing setup labels. */
const SETUP_LABELS: Readonly<Record<CustomFunctionSetupFeatureType, string>> = {
  [CustomFunctionSetupFeature.Deno]: 'Deno imports, strict settings, and check task',
  [CustomFunctionSetupFeature.Editor]: 'VS Code-compatible Deno recommendations',
  [CustomFunctionSetupFeature.Skill]: 'Transcend Custom Function coding-agent skill',
  [CustomFunctionSetupFeature.Ci]: 'Secure GitHub Actions checks and gated deployment',
  [CustomFunctionSetupFeature.SecretDocs]: 'Secret-name documentation and .gitignore entry',
};

/**
 * Resolve setup from flags or one checkbox prompt.
 *
 * @param context - CLI context
 * @param prompts - Prompt adapters
 * @param flags - Setup flags
 * @param options - Project and requirement state
 * @returns Selected setup features
 */
async function resolveFeatures(
  context: LocalContext,
  prompts: CustomFunctionPrompts,
  flags: CustomFunctionScaffoldFlags,
  options: {
    /** Whether a setup answer is required. */
    requireAnswer: boolean;
    /** Whether a project-level skill directory exists. */
    hasProjectSkillDirectory: boolean;
    /** Whether GitHub Actions is applicable. */
    usesGithub: boolean;
  },
): Promise<CustomFunctionSetupFeatureType[]> {
  const interactive = isInteractiveInvocation(context, flags);
  let features: CustomFunctionSetupFeatureType[];
  if (flags.setup) {
    features = resolveSetupFeatures(flags.setup, {
      hasProjectSkillDirectory: interactive && options.hasProjectSkillDirectory,
    });
  } else if (options.requireAnswer) {
    if (!interactive) {
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
          (recommended.has(feature) && feature !== CustomFunctionSetupFeature.Ci) ||
          options.usesGithub,
      }),
    );
    features = await prompts.checkbox('Choose optional repository setup:', choices);
  } else {
    features = [];
  }
  return applySetupFeatureOverrides(features, setupOverrides(flags));
}

/**
 * Preview, approve, apply, and report one plan.
 *
 * @param context - CLI context
 * @param flags - Interaction flags
 * @param prompts - Prompt adapters
 * @param plan - Validated plan
 */
async function executePlan(
  context: LocalContext,
  flags: CustomFunctionScaffoldFlags,
  prompts: CustomFunctionPrompts,
  plan: CustomFunctionProjectPlan,
): Promise<void> {
  const interactive = isInteractiveInvocation(context, flags);
  if (!flags.json) {
    context.logger.info(renderProjectPlan(plan, context.process.cwd()));
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
    await applyCustomFunctionProjectPlan(context, plan);
  }
  const applied = approved && !flags.dryRun && plan.changes.length > 0;
  const result = buildPlanResult(plan, {
    applied,
    dryRun: flags.dryRun,
    cwd: context.process.cwd(),
  });
  if (flags.json) {
    context.process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  if (flags.dryRun) {
    context.logger.info('Dry run complete. No changes were written.');
    return;
  }
  if (!approved) {
    context.logger.info('No changes applied.');
    return;
  }
  if (plan.changes.length === 0) {
    context.logger.info('Custom Function project is already initialized.');
    return;
  }
  context.logger.info('Custom Function project updated.');
  if (plan.nextSteps.length > 0) {
    context.logger.info('\nNext steps:');
    plan.nextSteps.forEach((step, index) => {
      context.logger.info(`  ${index + 1}. ${step}`);
    });
  }
}

/**
 * Run `custom-functions init`.
 *
 * @param context - CLI context
 * @param flags - Command flags
 * @param directory - Optional target directory
 */
export async function runCustomFunctionInit(
  context: LocalContext,
  flags: CustomFunctionScaffoldFlags,
  directory?: string,
): Promise<void> {
  const state = await discoverCustomFunctionProject(context, {
    ...(directory ? { directory } : {}),
    ...(flags.manifest ? { manifest: flags.manifest } : {}),
  });
  const prompts = new CustomFunctionPrompts(context);
  const features = await resolveFeatures(context, prompts, flags, {
    requireAnswer: true,
    hasProjectSkillDirectory: state.existingSkillDirectories.length > 0,
    usesGithub: state.usesGithub,
  });
  const snapshots = collectPlanningSnapshots(
    context,
    getPlanningCandidatePaths(state, { features }),
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
  await executePlan(context, flags, prompts, plan);
}

/**
 * Run `custom-functions new`.
 *
 * @param context - CLI context
 * @param flags - Command flags
 * @param directory - Optional target directory
 */
export async function runCustomFunctionNew(
  context: LocalContext,
  flags: CustomFunctionNewFlags,
  directory?: string,
): Promise<void> {
  const state = await discoverCustomFunctionProject(context, {
    ...(directory ? { directory } : {}),
    ...(flags.manifest ? { manifest: flags.manifest } : {}),
  });
  const prompts = new CustomFunctionPrompts(context);
  const interactive = isInteractiveInvocation(context, flags);
  const name =
    flags.name ?? (interactive ? await prompts.text('Custom Function display name:') : undefined);
  if (!name) {
    throw new Error('Missing Custom Function name. Pass --name in a non-interactive invocation.');
  }
  const template =
    flags.template ??
    (interactive
      ? await prompts.select<CustomFunctionTemplateName>(
          'Starter type:',
          [
            { name: 'General', value: 'general' },
            { name: 'DSR datapoint', value: 'dsr-datapoint' },
            { name: 'DSR request enricher', value: 'dsr-enricher' },
            { name: 'Combined DSR datapoint + enricher', value: 'dsr-both' },
          ],
          'general',
        )
      : undefined);
  if (!template || !CUSTOM_FUNCTION_TEMPLATE_NAMES.includes(template)) {
    throw new Error(
      'Missing Custom Function template. Pass --template=general, --template=dsr-datapoint, --template=dsr-enricher, or --template=dsr-both.',
    );
  }
  const generated = prepareGeneratedCustomFunction(name, template);
  const manifestExists = context.fs.existsSync(state.manifestPath);
  const features = await resolveFeatures(context, prompts, flags, {
    requireAnswer: !manifestExists,
    hasProjectSkillDirectory: state.existingSkillDirectories.length > 0,
    usesGithub: state.usesGithub,
  });
  const snapshots = collectPlanningSnapshots(
    context,
    getPlanningCandidatePaths(state, { features, generated }),
  );
  const plan = buildNewPlan(
    {
      state,
      snapshots,
      contractVersion: CUSTOM_FUNCTION_TYPES_VERSION,
      cliVersion: CLI_VERSION,
    },
    { features, generated },
  );
  await executePlan(context, flags, prompts, plan);
}
