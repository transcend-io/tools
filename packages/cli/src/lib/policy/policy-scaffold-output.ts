import {
  toPublicPlannedChange,
  type PublicPlannedChange,
} from '../scaffolding/project-plan-output.js';
import type { PolicyInitProjectPlan, PolicySetupFeature } from './policy-scaffold-model.js';

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
  /** Explicitly selected repository integrations. */
  features: PolicySetupFeature[];
  /** Compact prompt for continuing with a coding agent. */
  aiHandoff: string;
  /** Compatible local policy tool versions. */
  tools: PolicyInitToolVersions;
}

/**
 * Build the compact policy implementation and CI handoff.
 *
 * @param options - Portable example path and lint command
 * @returns Raw one-line prompt
 */
export function buildPolicyInitAiHandoff(options: {
  /** Display path to the policy project. */
  projectPath: string;
  /** Display path to an exact disposable example. */
  examplePath?: string;
  /** Copyable lint command. */
  lintCommand: string;
}): string {
  if (!options.examplePath) {
    return (
      `Ask your coding agent to review the existing policy project in ${options.projectPath}, ` +
      `align its document tree and input/output contract with the intended application, adapt ` +
      `repository validation as needed, and rerun ${options.lintCommand}.`
    );
  }
  return (
    `Ask your coding agent to replace the disposable example in ${options.examplePath} with ` +
    `the intended policy document tree and input/output contract, adapt repository validation ` +
    `to local conventions, and rerun ${options.lintCommand}.`
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
    features: [...plan.features],
    aiHandoff: options.aiHandoff,
    tools: options.tools,
  };
}
