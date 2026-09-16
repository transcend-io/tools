import {
  toPublicPlannedChange,
  type PublicPlannedChange,
} from '../scaffolding/project-plan-output.js';
import type { CustomFunctionProjectPlan } from './scaffold-model.js';

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
    changes: plan.changes.map((change) => toPublicPlannedChange(options.cwd, change)),
    warnings: plan.warnings,
    nextSteps: plan.nextSteps,
    aiHandoff: options.aiHandoff,
  };
}
