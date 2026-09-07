import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { formatMissingManifestMessage } from '../../../lib/custom-functions/missing-manifest.js';
import type { CustomFunctionProjectPlan } from '../../../lib/custom-functions/scaffold-model.js';
import {
  buildPlanResult,
  renderProjectPlan,
} from '../../../lib/custom-functions/scaffold-output.js';
import {
  buildAddFunctionPlan,
  getAddFunctionPlanningCandidatePaths,
  prepareGeneratedCustomFunction,
} from '../../../lib/custom-functions/scaffold-planning.js';
import {
  CUSTOM_FUNCTION_TEMPLATE_NAMES,
  type CustomFunctionTemplateName,
} from '../../../lib/custom-functions/scaffold-templates.js';
import {
  collectPlanningSnapshots,
  discoverCustomFunctionManifests,
  discoverCustomFunctionProject,
} from '../project-discovery.js';
import { applyCustomFunctionProjectPlan } from '../project-plan-apply.js';
import { CustomFunctionPrompts, PromptCancelledError } from '../prompts.js';

/** Flags for `custom-functions new`. */
export interface CustomFunctionNewFlags {
  /** Explicit existing manifest path. */
  manifest?: string;
  /** Custom Function display name. */
  name?: string;
  /** Starter handler shape. */
  template?: CustomFunctionTemplateName;
  /** Disable prompts. */
  noInteractive: boolean;
  /** Render but do not apply. */
  dryRun: boolean;
  /** Approve the final displayed plan. */
  yes: boolean;
  /** Emit one stable JSON result on stdout. */
  json: boolean;
}

/**
 * Whether this invocation can ask questions.
 *
 * @param context - CLI context
 * @param flags - Interaction flags
 * @returns Whether prompts are enabled
 */
function isInteractiveInvocation(
  context: LocalContext,
  flags: Pick<CustomFunctionNewFlags, 'json' | 'noInteractive'>,
): boolean {
  return (
    !flags.json &&
    !flags.noInteractive &&
    Boolean(context.process.stdin.isTTY && context.process.stderr.isTTY)
  );
}

/**
 * Preview, approve, apply, and report an add-function plan.
 *
 * @param context - CLI context
 * @param flags - Interaction flags
 * @param prompts - Prompt adapters
 * @param plan - Validated plan
 */
async function executePlan(
  context: LocalContext,
  flags: CustomFunctionNewFlags,
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
  context.logger.info('Custom Function added.');
  if (plan.nextSteps.length > 0) {
    context.logger.info('\nNext steps:');
    plan.nextSteps.forEach((step, index) => {
      context.logger.info(`  ${index + 1}. ${step}`);
    });
  }
}

/**
 * Scaffold one deterministic local Custom Function.
 *
 * @param this - CLI context
 * @param flags - Template and interaction flags
 * @param directory - Optional target directory
 */
export async function _new(
  this: LocalContext,
  flags: CustomFunctionNewFlags,
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
          command: 'new',
        }),
      );
    }
    const prompts = new CustomFunctionPrompts(this);
    const interactive = isInteractiveInvocation(this, flags);
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
    const snapshots = collectPlanningSnapshots(
      this,
      getAddFunctionPlanningCandidatePaths(state, generated),
    );
    const plan = buildAddFunctionPlan(
      {
        state,
        snapshots,
      },
      { generated },
    );
    await executePlan(this, flags, prompts, plan);
  } catch (error) {
    if (error instanceof PromptCancelledError) {
      this.process.exit(130);
    }
    throw error;
  }
}

export { _new as newCustomFunction };
