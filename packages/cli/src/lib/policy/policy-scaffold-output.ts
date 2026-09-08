import {
  toPublicPlannedChange,
  type PublicPlannedChange,
} from '../scaffolding/project-plan-output.js';
import type { PolicyInitProjectPlan } from './policy-scaffold-model.js';

/** Detected local policy tool versions. */
export interface PolicyInitToolVersions {
  /** OPA version, or null when missing or incompatible. */
  opa: string | null;
  /** Regal version, or null when missing or incompatible. */
  regal: string | null;
}

/** Stable machine-readable policy initialization result. */
export interface PolicyInitPlanResult {
  /** JSON contract version. */
  version: number;
  /** Command that produced the result. */
  command: 'init';
  /** Whether the plan was applied. */
  applied: boolean;
  /** Whether this was a dry run. */
  dryRun: boolean;
  /** Absolute policy target directory. */
  targetDirectory: string;
  /** Absolute policy manifest path. */
  manifestPath: string;
  /** Planned mutations without file contents. */
  changes: PublicPlannedChange[];
  /** Non-fatal preservation and runtime warnings. */
  warnings: string[];
  /** Suggested raw one-line follow-up commands. */
  nextSteps: string[];
  /** Compact prompt for continuing with a coding agent. */
  aiHandoff: string;
  /** Compatible local policy tool versions. */
  tools: PolicyInitToolVersions;
}

/**
 * Build the compact core-phase AI handoff.
 *
 * @param options - Portable example path and lint command
 * @returns Raw one-line prompt
 */
export function buildPolicyInitAiHandoff(options: {
  /** Display path to the disposable example. */
  examplePath: string;
  /** Copyable lint command. */
  lintCommand: string;
}): string {
  return (
    `Ask your coding agent to replace the disposable example in ${options.examplePath} with ` +
    `your intended OPA document tree and input/output contract, then run ${options.lintCommand}.`
  );
}

/**
 * Build the stable machine-readable initialization result.
 *
 * @param plan - Policy project plan
 * @param options - Apply and runtime state
 * @returns Public JSON result
 */
export function buildPolicyInitPlanResult(
  plan: PolicyInitProjectPlan,
  options: {
    /** Whether the plan was applied. */
    applied: boolean;
    /** Whether this was a dry run. */
    dryRun: boolean;
    /** Working directory for portable paths. */
    cwd: string;
    /** Compact coding-agent prompt. */
    aiHandoff: string;
    /** Compatible local policy tool versions. */
    tools: PolicyInitToolVersions;
  },
): PolicyInitPlanResult {
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
    tools: options.tools,
  };
}
