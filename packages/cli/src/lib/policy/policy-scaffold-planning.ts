import { isAbsolute, join, posix, relative, sep } from 'node:path';

import {
  getManagedAgentSkillCandidatePaths,
  planManagedAgentSkill,
  type ManagedAgentSkillDefinition,
} from '../scaffolding/agent-skill.js';
import { displayProjectPath } from '../scaffolding/project-plan-output.js';
import {
  getPlanningPathSnapshot,
  getPlanningFileSnapshot,
  planFileChange,
  type PlanningPathSnapshot,
} from '../scaffolding/project-plan.js';
import {
  generatePolicyGithubActionsWorkflow,
  POLICY_CI_WORKFLOW_PATH,
} from './policy-scaffold-artifacts.js';
import {
  mergePolicyEditorExtensions,
  mergePolicyEditorSettings,
  mergePolicyEditorTasks,
  type PolicyEditorMergeResult,
} from './policy-scaffold-config.js';
import {
  POLICY_INIT_RESULT_VERSION,
  PolicySetupFeature,
  type PolicyInitProjectPlan,
  type PolicyProjectState,
  type PolicySetupFeature as PolicySetupFeatureType,
} from './policy-scaffold-model.js';
import {
  generatePolicyWorkspaceFiles,
  POLICY_STARTER_BUNDLE_DIRECTORY,
  type PolicyStarterFile,
} from './policy-scaffold-templates.js';
import { POLICY_SKILL_FILES, POLICY_SKILL_NAME } from './policy-skill.js';

/** Managed Policy Engine Agent Skill definition. */
const POLICY_MANAGED_SKILL: ManagedAgentSkillDefinition = {
  name: POLICY_SKILL_NAME,
  displayName: 'Policy Engine',
  owner: '@transcend-io/cli',
  files: POLICY_SKILL_FILES,
};

/** In-memory input consumed by the pure policy initializer. */
export interface PolicyInitPlanningInput {
  /** Project discovery state. */
  state: PolicyProjectState;
  /** Potential mutation paths keyed by absolute path. */
  snapshots: Readonly<Record<string, PlanningPathSnapshot>>;
}

/** Optional repository setup selected for policy initialization. */
export interface PolicyInitPlanOptions {
  /** Selected setup features. */
  features: readonly PolicySetupFeatureType[];
  /** Exact released Transcend CLI version for generated CI. */
  cliVersion: string;
}

/**
 * Enumerate all core starter paths that could be created.
 *
 * @param state - Policy project state
 * @param options - Selected repository setup
 * @returns Absolute candidate paths
 */
export function getPolicyInitPlanningCandidatePaths(
  state: PolicyProjectState,
  options: Pick<PolicyInitPlanOptions, 'features'>,
): string[] {
  const paths = new Set(
    generatePolicyWorkspaceFiles().map(({ path }) => join(state.targetDirectory, path)),
  );
  const selected = new Set(options.features);
  if (selected.has(PolicySetupFeature.Editor)) {
    paths.add(join(state.projectRoot, '.vscode', 'settings.json'));
    paths.add(join(state.projectRoot, '.vscode', 'extensions.json'));
    paths.add(join(state.projectRoot, '.vscode', 'tasks.json'));
  }
  if (selected.has(PolicySetupFeature.Skill)) {
    getManagedAgentSkillCandidatePaths(
      state.projectRoot,
      state.existingSkillDirectories,
      POLICY_MANAGED_SKILL,
    ).forEach((path) => paths.add(path));
  }
  if (selected.has(PolicySetupFeature.Ci) && state.repositoryRoot && state.usesGithub) {
    paths.add(join(state.repositoryRoot, POLICY_CI_WORKFLOW_PATH));
  }
  return [...paths].sort((left, right) => left.localeCompare(right));
}

/**
 * Ensure a destination stays below an approved project root.
 *
 * @param root - Approved root
 * @param path - Candidate path
 */
function assertContained(root: string, path: string): void {
  const child = relative(root, path);
  if (child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child)) {
    throw new Error(`Refusing to modify path outside project root: ${path}`);
  }
}

/**
 * Enumerate generated file and directory paths allowed in an exact starter.
 *
 * @param files - Starter files
 * @returns POSIX relative paths
 */
function starterRelativePaths(files: readonly PolicyStarterFile[]): Set<string> {
  const paths = new Set<string>([`${POLICY_STARTER_BUNDLE_DIRECTORY}/input.json`]);
  files.forEach(({ path }) => {
    paths.add(path);
    let parent = posix.dirname(path);
    while (parent !== '.') {
      paths.add(parent);
      parent = posix.dirname(parent);
    }
  });
  return paths;
}

/**
 * Add or classify one regular-file mutation.
 *
 * @param plan - Policy plan being assembled
 * @param input - Collected snapshots
 * @param options - Desired file
 */
function addFileChange(
  plan: PolicyInitProjectPlan,
  input: PolicyInitPlanningInput,
  options: {
    /** Absolute destination path. */
    path: string;
    /** Complete desired contents. */
    contents: string;
    /** Human-readable plan description. */
    description: string;
    /** Refuse existing contents. */
    createOnly?: boolean;
  },
): void {
  const change = planFileChange({
    snapshot: getPlanningFileSnapshot(input.snapshots, options.path),
    after: options.contents,
    description: options.description,
    ...(options.createOnly === undefined ? {} : { createOnly: options.createOnly }),
  });
  if (change) {
    plan.changes.push(change);
  } else {
    plan.unchanged.push(options.path);
  }
}

/**
 * Add one safe editor merge and its preservation warnings.
 *
 * @param plan - Policy plan being assembled
 * @param input - Collected snapshots
 * @param path - Absolute editor artifact path
 * @param result - Pure JSONC merge result
 * @param description - Human-readable plan description
 * @param cwd - Invocation directory for portable warning paths
 */
function addEditorMerge(
  plan: PolicyInitProjectPlan,
  input: PolicyInitPlanningInput,
  path: string,
  result: PolicyEditorMergeResult,
  description: string,
  cwd: string,
): void {
  addFileChange(plan, input, {
    path,
    contents: result.contents,
    description,
  });
  plan.warnings.push(
    ...result.warnings.map((warning) => `${warning} (${displayProjectPath(cwd, path)})`),
  );
}

/**
 * Build a safe policy project plan without reading the filesystem.
 *
 * Empty targets receive the complete starter. Existing targets are classified
 * only; no domain file is added, merged, or overwritten.
 *
 * @param input - Collected project state and path snapshots
 * @param options - Selected setup and pinned CLI version
 * @returns Validated policy initialization plan
 */
export function buildPolicyInitPlan(
  input: PolicyInitPlanningInput,
  options: PolicyInitPlanOptions,
): PolicyInitProjectPlan {
  const { state } = input;
  const files = generatePolicyWorkspaceFiles();
  const newCommand = 'transcend policy new';
  const plan: PolicyInitProjectPlan = {
    version: POLICY_INIT_RESULT_VERSION,
    command: 'init',
    rootDirectory: state.projectRoot,
    targetDirectory: state.targetDirectory,
    // Init creates a workspace only; bundles (and their .manifest) come from `policy new`.
    manifestPath: state.targetDirectory,
    changes: [],
    unchanged: [],
    warnings: [],
    nextSteps: [newCommand],
    features: [...options.features],
  };

  const candidatePaths = getPolicyInitPlanningCandidatePaths(state, options);
  assertContained(state.projectRoot, state.targetDirectory);
  candidatePaths.forEach((path) => assertContained(state.projectRoot, path));

  if (state.relativeFilePaths.length === 0) {
    plan.directoryPreconditions = [
      {
        path: state.targetDirectory,
        relativePaths: [...state.relativePaths],
      },
    ];
    files.forEach((file) => {
      const path = join(state.targetDirectory, file.path);
      const snapshot = getPlanningPathSnapshot(input.snapshots, path);
      if (snapshot.kind !== 'absent') {
        throw new Error(`Expected an empty policy target, but found an entry at: ${path}`);
      }
      addFileChange(plan, input, {
        path,
        contents: file.contents,
        description: file.description,
        createOnly: true,
      });
    });
  } else {
    let allWorkspaceFilesMatch = true;
    files.forEach((file) => {
      const path = join(state.targetDirectory, file.path);
      const snapshot = getPlanningPathSnapshot(input.snapshots, path);
      if (snapshot.kind === 'file' && snapshot.contents === file.contents) {
        plan.unchanged.push(path);
        return;
      }
      allWorkspaceFilesMatch = false;
      if (snapshot.kind !== 'absent') {
        plan.unchanged.push(path);
        plan.warnings.push(
          `Existing policy scaffold path was left unchanged: ${displayProjectPath(
            state.invocationDirectory,
            path,
          )}`,
        );
      }
    });

    const allowedPaths = starterRelativePaths(files);
    const hasCustomPaths = state.relativeFilePaths.some((path) => !allowedPaths.has(path));
    if (!allWorkspaceFilesMatch || hasCustomPaths) {
      plan.warnings.push(
        `Existing policy target contains custom or partial content, so no workspace files were added or overwritten. ` +
          `Review ${displayProjectPath(
            state.invocationDirectory,
            state.targetDirectory,
          )} manually, then run \`${newCommand}\`.`,
      );
    }
  }

  const selected = new Set(options.features);
  const root = state.projectRoot;
  if (selected.has(PolicySetupFeature.Editor)) {
    const settingsPath = join(root, '.vscode', 'settings.json');
    const extensionsPath = join(root, '.vscode', 'extensions.json');
    const tasksPath = join(root, '.vscode', 'tasks.json');

    type EditorMergeFn = (
      contents: string | null,
      repositoryRoot: string,
      targetDirectory: string,
    ) => PolicyEditorMergeResult;
    const editorArtifacts: {
      /** Absolute path. */
      path: string;
      /** Plan description. */
      description: string;
      /** Merge function. */
      merge: EditorMergeFn;
    }[] = [
      {
        path: settingsPath,
        description: 'Merge strict target-scoped OPA and Rego editor settings',
        merge: (contents, repositoryRoot, targetDirectory) =>
          mergePolicyEditorSettings(contents, repositoryRoot, targetDirectory),
      },
      {
        path: extensionsPath,
        description: 'Recommend the OPA extension and discourage its syntax-only conflict',
        merge: (contents) => mergePolicyEditorExtensions(contents),
      },
      {
        path: tasksPath,
        description: 'Create the VS Code task configuration',
        merge: (contents, repositoryRoot, targetDirectory) =>
          mergePolicyEditorTasks(contents, repositoryRoot, targetDirectory),
      },
    ];
    editorArtifacts.forEach(({ path, description, merge }) => {
      const snapshot = getPlanningPathSnapshot(input.snapshots, path);
      if (snapshot.kind !== 'absent' && snapshot.kind !== 'file') {
        plan.unchanged.push(path);
        plan.warnings.push(
          `Existing VS Code artifact is not a regular file and was left unchanged: ${displayProjectPath(
            state.invocationDirectory,
            path,
          )}`,
        );
        return;
      }
      addEditorMerge(
        plan,
        input,
        path,
        merge(snapshot.kind === 'file' ? snapshot.contents : null, root, state.targetDirectory),
        description,
        state.invocationDirectory,
      );
    });
  }

  if (selected.has(PolicySetupFeature.Skill)) {
    const skillPlan = planManagedAgentSkill({
      rootDirectory: root,
      existingDirectories: state.existingSkillDirectories,
      snapshots: input.snapshots,
      skill: POLICY_MANAGED_SKILL,
      preserveModified: true,
    });
    plan.changes.push(...skillPlan.changes);
    plan.unchanged.push(...skillPlan.unchanged);
    plan.warnings.push(
      ...skillPlan.warnings.map((warning) => {
        return skillPlan.unchanged.reduce(
          (rendered, path) =>
            rendered.replace(path, displayProjectPath(state.invocationDirectory, path)),
          warning,
        );
      }),
    );
  }

  if (selected.has(PolicySetupFeature.Ci)) {
    if (!state.repositoryRoot || !state.usesGithub) {
      plan.warnings.push(
        'GitHub Actions setup was selected, but this target is not inside a detected GitHub repository.',
      );
    } else {
      const workflowPath = join(state.repositoryRoot, POLICY_CI_WORKFLOW_PATH);
      const workspaceDirectory =
        relative(state.repositoryRoot, state.targetDirectory).split(sep).join('/') || '.';
      const workflowContents = generatePolicyGithubActionsWorkflow({
        cliVersion: options.cliVersion,
        workspaceDirectory,
        bundleDirectories: [],
      });
      const workflowSnapshot = getPlanningPathSnapshot(input.snapshots, workflowPath);
      if (workflowSnapshot.kind === 'absent') {
        addFileChange(plan, input, {
          path: workflowPath,
          contents: workflowContents,
          description: 'Add credential-free Policy Engine validation',
          createOnly: true,
        });
      } else if (
        workflowSnapshot.kind === 'file' &&
        workflowSnapshot.contents === workflowContents
      ) {
        plan.unchanged.push(workflowPath);
      } else {
        plan.unchanged.push(workflowPath);
        plan.warnings.push(
          `Existing GitHub Actions workflow was left unchanged: ${displayProjectPath(
            state.invocationDirectory,
            workflowPath,
          )}. Adapt it manually to validate each policy bundle.`,
        );
      }
    }
  }

  plan.changes.forEach(({ path }) => assertContained(state.projectRoot, path));
  return plan;
}
