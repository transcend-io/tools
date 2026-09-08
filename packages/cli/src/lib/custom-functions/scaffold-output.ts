import colors from 'colors';
import { createTwoFilesPatch } from 'diff';

import type { PlannedChange } from '../scaffolding/project-plan.js';
import { displayCliPath } from './paths.js';
import type { CustomFunctionProjectPlan } from './scaffold-model.js';

/** Stable public description of one planned mutation. */
export interface PublicPlannedChange {
  /** Create, merge, or link. */
  kind: 'create' | 'merge' | 'link';
  /** Display path. */
  target: string;
  /** Human-readable reason. */
  description: string;
}

/** Stable JSON scaffold result. */
export interface CustomFunctionPlanResult {
  /** JSON contract version. */
  version: number;
  /** Command that produced the plan. */
  command: 'init' | 'new';
  /** Whether the plan was applied. */
  applied: boolean;
  /** Whether this was a dry run. */
  dryRun: boolean;
  /** Absolute target directory. */
  targetDirectory: string;
  /** Absolute manifest path. */
  manifestPath: string;
  /** Planned mutations without file contents. */
  changes: PublicPlannedChange[];
  /** Non-fatal warnings. */
  warnings: string[];
  /** Suggested next commands. */
  nextSteps: string[];
  /** Compact prompt for continuing with a coding agent. */
  aiHandoff: string;
}

/**
 * Make a path relative for terminal output.
 *
 * @param cwd - Working directory
 * @param path - Absolute path
 * @returns Portable display path
 */
export function displayPath(cwd: string, path: string): string {
  return displayCliPath(cwd, path);
}

/**
 * Convert an internal mutation to its stable public shape.
 *
 * @param cwd - Working directory
 * @param change - Internal mutation
 * @returns Public mutation
 */
function publicChange(cwd: string, change: PlannedChange): PublicPlannedChange {
  if (change.kind === 'link') {
    return {
      kind: 'link',
      target: `${displayPath(cwd, change.path)} -> ${change.target}`,
      description: change.description,
    };
  }
  return {
    kind: change.before === null ? 'create' : 'merge',
    target: displayPath(cwd, change.path),
    description: change.description,
  };
}

/**
 * Build the stable machine-readable scaffold result.
 *
 * @param plan - Project plan
 * @param options - Apply state
 * @returns JSON result
 */
export function buildPlanResult(
  plan: CustomFunctionProjectPlan,
  options: {
    /** Whether the plan was applied. */
    applied: boolean;
    /** Whether the invocation was a dry run. */
    dryRun: boolean;
    /** Working directory for portable paths. */
    cwd: string;
    /** Compact prompt for continuing with a coding agent. */
    aiHandoff: string;
  },
): CustomFunctionPlanResult {
  return {
    version: plan.version,
    command: plan.command,
    applied: options.applied,
    dryRun: options.dryRun,
    targetDirectory: plan.targetDirectory,
    manifestPath: plan.manifestPath,
    changes: plan.changes.map((change) => publicChange(options.cwd, change)),
    warnings: plan.warnings,
    nextSteps: plan.nextSteps,
    aiHandoff: options.aiHandoff,
  };
}

/**
 * Render a human-readable complete project plan.
 *
 * @param plan - Project plan
 * @param cwd - Working directory
 * @returns Preview text
 */
export function renderProjectPlan(plan: CustomFunctionProjectPlan, cwd: string): string {
  const lines = [
    colors.bold('Custom Function plan'),
    `  ${colors.dim('Target:')}   ${colors.cyan(displayPath(cwd, plan.targetDirectory))}`,
    `  ${colors.dim('Manifest:')} ${colors.cyan(displayPath(cwd, plan.manifestPath))}`,
    '',
  ];
  if (plan.changes.length === 0) {
    lines.push(colors.dim('No changes needed.'));
  } else {
    lines.push(colors.bold('Changes'));
    plan.changes.forEach((change) => {
      const item = publicChange(cwd, change);
      const kind = {
        create: colors.green(item.kind.padEnd(7)),
        merge: colors.cyan(item.kind.padEnd(7)),
        link: colors.magenta(item.kind.padEnd(7)),
      }[item.kind];
      lines.push(`  ${kind} ${item.target}`);
      if (change.kind === 'file' && change.before !== null) {
        const path = displayPath(cwd, change.path);
        const patch = createTwoFilesPatch(path, path, change.before, change.after, '', '', {
          context: 3,
        });
        lines.push(
          ...patch
            .trimEnd()
            .split('\n')
            .map((line) => `    ${line}`),
        );
      }
    });
  }
  if (plan.unchanged.length > 0) {
    lines.push('', colors.bold('Left unchanged'));
    plan.unchanged.forEach((path) => lines.push(`  ${colors.dim(displayPath(cwd, path))}`));
  }
  if (plan.warnings.length > 0) {
    lines.push('', colors.bold(colors.yellow('Warnings')));
    plan.warnings.forEach((warning) => lines.push(`  ${colors.yellow(warning)}`));
  }
  return `${lines.join('\n')}\n`;
}
