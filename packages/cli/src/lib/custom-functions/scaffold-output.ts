import { relative, sep } from 'node:path';

import { createTwoFilesPatch } from 'diff';

import type { CustomFunctionProjectPlan, PlannedChange } from './scaffold-model.js';

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
}

/**
 * Make a path relative for terminal output.
 *
 * @param cwd - Working directory
 * @param path - Absolute path
 * @returns Portable display path
 */
export function displayPath(cwd: string, path: string): string {
  const value = relative(cwd, path).split(sep).join('/');
  return value.length === 0 ? '.' : value;
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
    `Target:   ${displayPath(cwd, plan.targetDirectory)}`,
    `Manifest: ${displayPath(cwd, plan.manifestPath)}`,
    '',
  ];
  if (plan.changes.length === 0) {
    lines.push('No changes needed.');
  } else {
    lines.push('Changes:');
    plan.changes.forEach((change) => {
      const item = publicChange(cwd, change);
      lines.push(`  ${item.kind.padEnd(7)} ${item.target}`);
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
    lines.push('', 'Left unchanged:');
    plan.unchanged.forEach((path) => lines.push(`  ${displayPath(cwd, path)}`));
  }
  if (plan.warnings.length > 0) {
    lines.push('', 'Warnings:');
    plan.warnings.forEach((warning) => lines.push(`  ${warning}`));
  }
  return `${lines.join('\n')}\n`;
}
