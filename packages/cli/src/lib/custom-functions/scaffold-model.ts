import type { ExistingProjectSkillDirectory } from '../scaffolding/agent-skill.js';
import type { ProjectPlan } from '../scaffolding/project-plan.js';

/** Version of the stable scaffold/check JSON result contract. */
export const CUSTOM_FUNCTION_RESULT_VERSION = 1 as const;

/** One repository setup capability. */
export const CustomFunctionSetupFeature = {
  /** Deno import map and strict compiler configuration. */
  Deno: 'deno',
  /** Target-scoped editor configuration. */
  Editor: 'editor',
  /** Coding-agent authoring skill. */
  Skill: 'skill',
  /** GitHub Actions validation workflow. */
  Ci: 'ci',
} as const;

/** One repository setup capability. */
export type CustomFunctionSetupFeature =
  (typeof CustomFunctionSetupFeature)[keyof typeof CustomFunctionSetupFeature];

/** Repository and target state collected before planning. */
export interface CustomFunctionProjectState {
  /** Directory from which the CLI was invoked. */
  invocationDirectory: string;
  /** Absolute user-selected target directory. */
  targetDirectory: string;
  /** Root that owns repository-level editor and agent setup. */
  projectRoot: string;
  /** Directory relative to which manifest file references resolve. */
  manifestDirectory: string;
  /** Absolute manifest path. */
  manifestPath: string;
  /** Nearest repository root, when present. */
  repositoryRoot?: string;
  /** Existing Deno configuration path, or desired deno.json path. */
  denoConfigPath: string;
  /** Existing project-level skill directories; home state is deliberately ignored. */
  existingSkillDirectories: ExistingProjectSkillDirectory[];
  /** Whether the repository appears to use GitHub. */
  usesGithub: boolean;
  /** Case-preserving relative paths below the manifest directory. */
  relativePaths: string[];
}

/** A complete, validated scaffold plan. */
export interface CustomFunctionProjectPlan extends ProjectPlan {
  /** JSON contract version. */
  version: typeof CUSTOM_FUNCTION_RESULT_VERSION;
  /** Command that produced the plan. */
  command: 'init' | 'new';
  /** Absolute project target directory. */
  targetDirectory: string;
  /** Absolute manifest path. */
  manifestPath: string;
  /** Files inspected and deliberately left unchanged. */
  unchanged: string[];
  /** Non-fatal plan warnings. */
  warnings: string[];
  /** Commands shown after a successful apply. */
  nextSteps: string[];
}
