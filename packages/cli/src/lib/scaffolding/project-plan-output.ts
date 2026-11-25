import { isAbsolute, relative, sep } from 'node:path';

import colors from 'colors';
import { createTwoFilesPatch } from 'diff';

import type { PlannedChange, ProjectPlan } from './project-plan.js';

/** Stable public description of one planned mutation. */
export interface PublicPlannedChange {
  /** Create, merge, or link. */
  kind: 'create' | 'merge' | 'link';
  /** Display path. */
  target: string;
  /** Human-readable reason. */
  description: string;
}

/** Project plan fields displayed in a terminal preview. */
export interface DisplayableProjectPlan extends ProjectPlan {
  /** Files inspected and deliberately left unchanged. */
  unchanged: readonly string[];
  /** Non-fatal plan warnings. */
  warnings: readonly string[];
}

/** One project path displayed above a plan. */
export interface ProjectPlanDetail {
  /** Human-readable field label without a colon. */
  label: string;
  /** Absolute project path. */
  path: string;
}

/**
 * Prefer a portable path relative to the invocation directory.
 *
 * @param cwd - Process working directory
 * @param path - Absolute path
 * @returns Relative path when contained by cwd, otherwise the absolute path
 */
export function displayProjectPath(cwd: string, path: string): string {
  const value = relative(cwd, path).split(sep).join('/');
  if (value.length === 0) {
    return '.';
  }
  if (value === '..' || value.startsWith('../') || isAbsolute(value)) {
    return path.split(sep).join('/');
  }
  return value;
}

/**
 * Quote one value for POSIX-compatible command snippets.
 *
 * @param value - Raw command argument
 * @returns Safely single-quoted argument
 */
export function quoteShellArgument(value: string): string {
  return `'${value.replace(/'/gu, "'\\''")}'`;
}

/**
 * Convert an internal mutation to its stable public shape.
 *
 * @param cwd - Working directory
 * @param change - Internal mutation
 * @returns Public mutation
 */
export function toPublicPlannedChange(cwd: string, change: PlannedChange): PublicPlannedChange {
  if (change.kind === 'link') {
    return {
      kind: 'link',
      target: `${displayProjectPath(cwd, change.path)} -> ${change.target}`,
      description: change.description,
    };
  }
  return {
    kind: change.before === null ? 'create' : 'merge',
    target: displayProjectPath(cwd, change.path),
    description: change.description,
  };
}

/**
 * Render a human-readable complete project plan.
 *
 * @param plan - Project plan
 * @param options - Domain heading and project paths
 * @returns Preview text
 */
export function renderProjectPlan(
  plan: DisplayableProjectPlan,
  options: {
    /** Working directory for portable paths. */
    cwd: string;
    /** Domain-specific plan heading. */
    title: string;
    /** Project paths displayed above changes. */
    details: readonly ProjectPlanDetail[];
  },
): string {
  const widestLabel = Math.max(...options.details.map(({ label }) => label.length + 1), 0);
  const lines = [
    colors.bold(options.title),
    ...options.details.map(({ label, path }) => {
      const paddedLabel = `${label}:`.padEnd(widestLabel);
      return `  ${colors.dim(paddedLabel)} ${colors.cyan(displayProjectPath(options.cwd, path))}`;
    }),
    '',
  ];
  if (plan.changes.length === 0) {
    lines.push(colors.dim('No changes needed.'));
  } else {
    lines.push(colors.bold('Changes'));
    plan.changes.forEach((change) => {
      const item = toPublicPlannedChange(options.cwd, change);
      const kind = {
        create: colors.green(item.kind.padEnd(7)),
        merge: colors.cyan(item.kind.padEnd(7)),
        link: colors.magenta(item.kind.padEnd(7)),
      }[item.kind];
      lines.push(`  ${kind} ${item.target}`);
      if (change.kind === 'file' && change.before !== null) {
        const path = displayProjectPath(options.cwd, change.path);
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
    plan.unchanged.forEach((path) =>
      lines.push(`  ${colors.dim(displayProjectPath(options.cwd, path))}`),
    );
  }
  if (plan.warnings.length > 0) {
    lines.push('', colors.bold(colors.yellow('Warnings')));
    plan.warnings.forEach((warning) => lines.push(`  ${colors.yellow(warning)}`));
  }
  return `${lines.join('\n')}\n`;
}
