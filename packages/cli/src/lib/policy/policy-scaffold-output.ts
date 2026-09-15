import {
  toPublicPlannedChange,
  type PublicPlannedChange,
} from '../scaffolding/project-plan-output.js';
import type { PolicyInitProjectPlan, PolicySetupFeature } from './policy-scaffold-model.js';
import { POLICY_SKILL_NAME } from './policy-skill.js';

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
 * @param options - Portable project path and next step
 * @returns Raw one-line prompt
 */
export function buildPolicyInitAiHandoff(options: {
  /** Display path to the policy project. */
  projectPath: string;
  /** Whether the policy authoring skill was installed. */
  hasSkill: boolean;
  /** Copyable new-bundle command. */
  newCommand: string;
}): string {
  const instruction = options.hasSkill ? `Use the \`${POLICY_SKILL_NAME}\` skill and run` : 'Run';
  return (
    `${instruction} ${options.newCommand} to add a bundle from a template, ` +
    `then adapt the policy document tree and input/output contract to the intended application.`
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
