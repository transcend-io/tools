import { join } from 'node:path';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { buildNewFunctionAiHandoff } from '../../../lib/custom-functions/ai-handoff.js';
import { CUSTOM_FUNCTION_SKILL_NAME } from '../../../lib/custom-functions/custom-function-skill.js';
import { formatMissingManifestMessage } from '../../../lib/custom-functions/missing-manifest.js';
import { buildCustomFunctionProjectArguments } from '../../../lib/custom-functions/paths.js';
import {
  collectPlanningSnapshots,
  discoverCustomFunctionManifests,
  discoverCustomFunctionProject,
} from '../../../lib/custom-functions/project-discovery.js';
import {
  CustomFunctionPrompts,
  PromptCancelledError,
} from '../../../lib/custom-functions/prompts.js';
import {
  buildPlanResult,
  displayPath,
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
  validateCustomFunctionDisplayName,
} from '../../../lib/custom-functions/scaffold-templates.js';
import { applyProjectPlan } from '../../../lib/scaffolding/project-plan-apply.js';

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
  flags: Pick<CustomFunctionNewFlags, 'json' | 'noInteractive'>,
  stdinIsTTY: boolean | undefined,
  stderrIsTTY: boolean | undefined,
): boolean {
  return !flags.json && !flags.noInteractive && Boolean(stdinIsTTY && stderrIsTTY);
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
    const interactive = isInteractiveInvocation(
      flags,
      this.process.stdin.isTTY,
      this.process.stderr.isTTY,
    );
    const name =
      flags.name ??
      (interactive
        ? await prompts.text('Custom Function display name:', undefined, (value) => {
            try {
              validateCustomFunctionDisplayName(value);
              return true;
            } catch (error) {
              return error instanceof Error ? error.message : String(error);
            }
          })
        : undefined);
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
    if (!this.fs.existsSync(state.denoConfigPath)) {
      plan.warnings.push(
        `No Deno configuration was found. Run ` +
          `transcend custom-functions init ${buildCustomFunctionProjectArguments(
            state.targetDirectory,
            state.manifestPath,
          )} --deno --noInteractive.`,
      );
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
    const skillRoot = state.repositoryRoot ?? state.targetDirectory;
    const hasSkill = state.existingSkillDirectories.some(({ path }) =>
      this.fs.existsSync(join(skillRoot, path, CUSTOM_FUNCTION_SKILL_NAME, 'SKILL.md')),
    );
    const aiHandoff = buildNewFunctionAiHandoff({
      displayName: generated.displayName,
      sourcePath: displayPath(
        this.process.cwd(),
        join(state.manifestDirectory, generated.sourceFile.path),
      ),
      targetDirectory: displayPath(this.process.cwd(), state.targetDirectory),
      manifestPath: displayPath(this.process.cwd(), state.manifestPath),
      hasSkill,
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
    this.logger.info('Custom Function added.');
    if (plan.nextSteps.length > 0) {
      this.logger.info('\nNext steps:');
      plan.nextSteps.forEach((step, index) => {
        this.logger.info(`  ${index + 1}. ${step}`);
      });
    }
    this.logger.info('\nAI handoff (paste this prompt to your coding agent):');
    this.logger.info(`  ${aiHandoff}`);
  } catch (error) {
    if (error instanceof PromptCancelledError) {
      this.process.exit(130);
    }
    throw error;
  }
}

export { _new as newCustomFunction };
