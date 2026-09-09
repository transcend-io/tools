import type { ExistingProjectSkillDirectory } from '../scaffolding/agent-skill.js';
import type { ProjectPlan } from '../scaffolding/project-plan.js';

/** Version of the stable policy initialization JSON result. */
export const POLICY_INIT_RESULT_VERSION = 1 as const;

/** Optional repository integrations for policy authoring. */
export const PolicySetupFeature = {
  /** Repository-level editor configuration. */
  Editor: 'editor',
  /** Managed policy authoring skill. */
  Skill: 'skill',
  /** Credential-free continuous integration. */
  Ci: 'ci',
} as const;

/** Optional repository integration for policy authoring. */
export type PolicySetupFeature = (typeof PolicySetupFeature)[keyof typeof PolicySetupFeature];

/** Repository and target state collected before policy planning. */
export interface PolicyProjectState {
  /** Directory from which the CLI was invoked. */
  invocationDirectory: string;
  /** Absolute user-selected policy directory. */
  targetDirectory: string;
  /** Repository or invocation root that owns setup artifacts. */
  projectRoot: string;
  /** Nearest repository root, when present. */
  repositoryRoot?: string;
  /** Existing project-level skill directories. */
  existingSkillDirectories: ExistingProjectSkillDirectory[];
  /** Whether the repository appears to use GitHub. */
  usesGithub: boolean;
  /** Case-preserving relative paths below the policy directory. */
  relativePaths: string[];
  /** Relative file and link paths below the policy directory. */
  relativeFilePaths: string[];
}

/** A complete, validated policy initialization plan. */
export interface PolicyInitProjectPlan extends ProjectPlan {
  /** JSON contract version. */
  version: typeof POLICY_INIT_RESULT_VERSION;
  /** Command that produced the plan. */
  command: 'init';
  /** Absolute policy project directory. */
  targetDirectory: string;
  /** Absolute policy manifest path. */
  manifestPath: string;
  /** Files inspected and deliberately left unchanged. */
  unchanged: string[];
  /** Non-fatal plan warnings. */
  warnings: string[];
  /** Raw commands shown after a successful apply. */
  nextSteps: string[];
  /** Exact generated example that remains safe to replace. */
  disposableExamplePath?: string;
  /** Selected repository integrations. */
  features: PolicySetupFeature[];
}
