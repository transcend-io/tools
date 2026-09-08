import { isAbsolute, join, posix, relative, sep } from 'node:path';

import { displayProjectPath, quoteShellArgument } from '../scaffolding/project-plan-output.js';
import {
  getPlanningPathSnapshot,
  planFileChange,
  type PlanningPathSnapshot,
} from '../scaffolding/project-plan.js';
import { getPolicyManifestPath } from './policy-project-discovery.js';
import {
  POLICY_INIT_RESULT_VERSION,
  type PolicyInitProjectPlan,
  type PolicyProjectState,
  type PolicySetupFeature,
} from './policy-scaffold-model.js';
import { generatePolicyStarterFiles, type PolicyStarterFile } from './policy-scaffold-templates.js';

/** In-memory input consumed by the pure policy initializer. */
export interface PolicyInitPlanningInput {
  /** Project discovery state. */
  state: PolicyProjectState;
  /** Potential mutation paths keyed by absolute path. */
  snapshots: Readonly<Record<string, PlanningPathSnapshot>>;
}

/** Optional repository setup reserved for the next policy DX phase. */
export interface PolicyInitPlanOptions {
  /** Selected setup features. Core initialization passes an empty list. */
  features: readonly PolicySetupFeature[];
}

/**
 * Build the copyable policy lint command for one target.
 *
 * @param state - Discovered project state
 * @returns Raw one-line command
 */
export function buildPolicyLintCommand(state: PolicyProjectState): string {
  const directory = displayProjectPath(state.invocationDirectory, state.targetDirectory);
  return `transcend policy lint --dir ${quoteShellArgument(directory)}`;
}

/**
 * Enumerate all core starter paths that could be created.
 *
 * @param state - Policy project state
 * @returns Absolute candidate paths
 */
export function getPolicyInitPlanningCandidatePaths(state: PolicyProjectState): string[] {
  return generatePolicyStarterFiles()
    .map(({ path }) => join(state.targetDirectory, path))
    .sort((left, right) => left.localeCompare(right));
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
  const paths = new Set<string>(['input.json']);
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
 * Build a safe policy project plan without reading the filesystem.
 *
 * Empty targets receive the complete starter. Existing targets are classified
 * only; no domain file is added, merged, or overwritten.
 *
 * @param input - Collected project state and path snapshots
 * @param options - Reserved setup selections
 * @returns Validated policy initialization plan
 */
export function buildPolicyInitPlan(
  input: PolicyInitPlanningInput,
  options: PolicyInitPlanOptions,
): PolicyInitProjectPlan {
  const { state } = input;
  const files = generatePolicyStarterFiles();
  const manifestPath = getPolicyManifestPath(state);
  const lintCommand = buildPolicyLintCommand(state);
  const resultPath = join(state.targetDirectory, 'policy_engine', 'example', 'result.rego');
  const plan: PolicyInitProjectPlan = {
    version: POLICY_INIT_RESULT_VERSION,
    command: 'init',
    rootDirectory: state.projectRoot,
    targetDirectory: state.targetDirectory,
    manifestPath,
    changes: [],
    unchanged: [],
    warnings: [],
    nextSteps: [
      lintCommand,
      `Edit ${quoteShellArgument(displayProjectPath(state.invocationDirectory, resultPath))}`,
    ],
    features: [...options.features],
  };

  const candidatePaths = files.map(({ path }) => join(state.targetDirectory, path));
  assertContained(state.projectRoot, state.targetDirectory);
  candidatePaths.forEach((path) => assertContained(state.projectRoot, path));

  if (state.relativePaths.length === 0) {
    files.forEach((file) => {
      const path = join(state.targetDirectory, file.path);
      const snapshot = getPlanningPathSnapshot(input.snapshots, path);
      if (snapshot.kind !== 'absent') {
        throw new Error(`Expected an empty policy target, but found an entry at: ${path}`);
      }
      const change = planFileChange({
        snapshot: { path, contents: null },
        after: file.contents,
        description: file.description,
        createOnly: true,
      });
      if (change) {
        plan.changes.push(change);
      }
    });
    return plan;
  }

  let allStarterFilesMatch = true;
  files.forEach((file) => {
    const path = join(state.targetDirectory, file.path);
    const snapshot = getPlanningPathSnapshot(input.snapshots, path);
    if (snapshot.kind === 'file' && snapshot.contents === file.contents) {
      plan.unchanged.push(path);
      return;
    }
    allStarterFilesMatch = false;
    if (snapshot.kind !== 'absent') {
      plan.unchanged.push(path);
      plan.warnings.push(`Existing policy scaffold path was left unchanged: ${path}`);
    }
  });

  const allowedPaths = starterRelativePaths(files);
  const hasCustomPaths = state.relativePaths.some((path) => !allowedPaths.has(path));
  if (!allStarterFilesMatch || hasCustomPaths) {
    plan.warnings.push(
      `Existing policy target contains custom or partial content, so no starter files were added or overwritten. ` +
        `Review ${state.targetDirectory} manually, then run \`${lintCommand}\`.`,
    );
  }
  return plan;
}
