import { dirname, isAbsolute, join, relative, sep } from 'node:path';

import {
  buildManagedAgentSkill,
  isUnmodifiedManagedAgentSkill,
  resolveAgentSkillDirectories,
} from '../scaffolding/agent-skill.js';
import {
  planFileChange,
  type PlannedLinkChange,
  type ProjectFileSnapshot,
} from '../scaffolding/project-plan.js';
import { insertCustomFunctionManifestEntry, parseCustomFunctionsManifest } from './manifest.js';
import { generateGithubActionsWorkflow } from './scaffold-artifacts.js';
import {
  mergeDenoConfiguration,
  mergeEditorExtensions,
  mergeEditorSettings,
} from './scaffold-config.js';
import {
  CUSTOM_FUNCTION_RESULT_VERSION,
  CustomFunctionSetupFeature,
  type CustomFunctionProjectPlan,
  type CustomFunctionProjectState,
  type CustomFunctionSetupFeature as CustomFunctionSetupFeatureType,
} from './scaffold-model.js';
import {
  CUSTOM_FUNCTION_SKILL_NAME,
  CUSTOM_FUNCTION_SKILL_MD,
  generateCustomFunctionTemplate,
  type GeneratedCustomFunctionTemplate,
} from './scaffold-templates.js';

/** Empty manifest used for first initialization. */
export const EMPTY_CUSTOM_FUNCTION_MANIFEST = `# Custom Functions managed as code.
functions: []
`;

/** State of one potentially mutated path. */
export type PlanningPathSnapshot =
  | {
      /** Snapshot kind. */
      kind: 'absent';
      /** Absolute path. */
      path: string;
    }
  | {
      /** Snapshot kind. */
      kind: 'file';
      /** Absolute path. */
      path: string;
      /** UTF-8 contents. */
      contents: string;
      /** File mode. */
      mode: number;
    }
  | {
      /** Snapshot kind. */
      kind: 'link';
      /** Absolute path. */
      path: string;
      /** Link target. */
      target: string;
    }
  | {
      /** Snapshot kind. */
      kind: 'directory';
      /** Absolute path. */
      path: string;
    };

/** In-memory input consumed by pure project planners. */
export interface CustomFunctionPlanningInput {
  /** Project discovery state. */
  state: CustomFunctionProjectState;
  /** Potential mutation paths keyed by absolute path. */
  snapshots: Readonly<Record<string, PlanningPathSnapshot>>;
}

/** In-memory input required only by project initialization. */
export interface CustomFunctionInitPlanningInput extends CustomFunctionPlanningInput {
  /** Exact authoring contract version. */
  contractVersion: string;
  /** Exact CLI version. */
  cliVersion: string;
}

/** Options shared by init and implicit init. */
export interface InitPlanOptions {
  /** Selected setup features. */
  features: readonly CustomFunctionSetupFeatureType[];
}

/**
 * Determine the repository-owned base for optional setup.
 *
 * @param state - Discovery state
 * @returns Repository root or target
 */
function setupRoot(state: CustomFunctionProjectState): string {
  return state.repositoryRoot ?? state.targetDirectory;
}

/**
 * Enumerate all paths that could be included in a plan.
 *
 * @param state - Discovery state
 * @param options - Selected setup and optional scaffold
 * @returns Absolute candidate paths
 */
export function getInitPlanningCandidatePaths(
  state: CustomFunctionProjectState,
  options: {
    /** Selected setup features. */
    features: readonly CustomFunctionSetupFeatureType[];
  },
): string[] {
  const root = setupRoot(state);
  const paths = new Set<string>([state.manifestPath]);
  const selected = new Set(options.features);
  if (selected.has(CustomFunctionSetupFeature.Deno)) {
    paths.add(state.denoConfigPath);
  }
  if (selected.has(CustomFunctionSetupFeature.Editor)) {
    paths.add(join(root, '.vscode', 'settings.json'));
    paths.add(join(root, '.vscode', 'extensions.json'));
  }
  if (selected.has(CustomFunctionSetupFeature.Skill)) {
    const directories = resolveAgentSkillDirectories(state.existingSkillDirectories);
    paths.add(join(root, directories.canonical, CUSTOM_FUNCTION_SKILL_NAME, 'SKILL.md'));
    directories.aliases.forEach((directory) => {
      paths.add(join(root, directory, CUSTOM_FUNCTION_SKILL_NAME));
    });
  }
  if (selected.has(CustomFunctionSetupFeature.Ci)) {
    paths.add(join(root, '.github', 'workflows', 'transcend-custom-functions.yml'));
  }
  return [...paths].sort((left, right) => left.localeCompare(right));
}

/**
 * Enumerate paths touched when adding one function to an initialized project.
 *
 * @param state - Project discovery state
 * @param generated - Generated function files
 * @returns Absolute candidate paths
 */
export function getAddFunctionPlanningCandidatePaths(
  state: CustomFunctionProjectState,
  generated: GeneratedCustomFunctionTemplate,
): string[] {
  return [
    state.manifestPath,
    join(state.manifestDirectory, generated.sourceFile.path),
    ...generated.payloadFiles.map((file) => join(state.manifestDirectory, file.path)),
  ].sort((left, right) => left.localeCompare(right));
}

/**
 * Read a required candidate snapshot.
 *
 * @param input - Planning input
 * @param path - Absolute path
 * @returns Snapshot
 */
function snapshotAt(input: CustomFunctionPlanningInput, path: string): PlanningPathSnapshot {
  const snapshot = input.snapshots[path];
  if (!snapshot) {
    throw new Error(`Missing preflight snapshot for ${path}`);
  }
  return snapshot;
}

/**
 * Adapt a generic snapshot to a regular-file plan input.
 *
 * @param input - Planning input
 * @param path - Absolute file path
 * @returns File snapshot
 */
function fileSnapshotAt(input: CustomFunctionPlanningInput, path: string): ProjectFileSnapshot {
  const snapshot = snapshotAt(input, path);
  if (snapshot.kind === 'directory' || snapshot.kind === 'link') {
    throw new Error(`Expected a regular file or absent path: ${path}`);
  }
  return snapshot.kind === 'file'
    ? { path, contents: snapshot.contents, mode: snapshot.mode }
    : { path, contents: null };
}

/**
 * Ensure a mutation stays below an approved project root.
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
 * Validate roots and case-insensitive destinations.
 *
 * @param state - Discovery state
 * @param paths - Planned destination paths
 */
function validatePlanDestinations(
  state: CustomFunctionProjectState,
  paths: readonly string[],
): void {
  const root = setupRoot(state);
  assertContained(state.targetDirectory, state.manifestPath);
  paths.forEach((path) => assertContained(root, path));
  const existing = new Map(
    state.relativePaths.map((path) => [path.toLocaleLowerCase('en-US'), path]),
  );
  paths.forEach((path) => {
    const relativePath = relative(state.manifestDirectory, path).split(sep).join('/');
    if (relativePath.startsWith('../')) {
      return;
    }
    const collision = existing.get(relativePath.toLocaleLowerCase('en-US'));
    if (collision && collision !== relativePath) {
      throw new Error(
        `Case-insensitive path collision: "${relativePath}" conflicts with "${collision}".`,
      );
    }
  });
}

/**
 * Add or classify a regular-file mutation.
 *
 * @param plan - Plan being assembled
 * @param input - Planning input
 * @param options - Desired file
 */
function addFileChange(
  plan: CustomFunctionProjectPlan,
  input: CustomFunctionPlanningInput,
  options: {
    /** Absolute path. */
    path: string;
    /** Complete desired contents. */
    contents: string;
    /** Human-readable reason. */
    description: string;
    /** Refuse existing contents. */
    createOnly?: boolean;
  },
): void {
  const change = planFileChange({
    snapshot: fileSnapshotAt(input, options.path),
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
 * Plan one direct skill installation and links into other existing directories.
 *
 * @param plan - Plan being assembled
 * @param input - Planning input
 */
function planSkill(plan: CustomFunctionProjectPlan, input: CustomFunctionPlanningInput): void {
  const root = setupRoot(input.state);
  const directories = resolveAgentSkillDirectories(input.state.existingSkillDirectories);
  const canonicalDirectory = join(root, directories.canonical, CUSTOM_FUNCTION_SKILL_NAME);
  const canonicalPath = join(canonicalDirectory, 'SKILL.md');
  const skillContents = buildManagedAgentSkill(CUSTOM_FUNCTION_SKILL_MD, '@transcend-io/cli');
  const canonicalSnapshot = fileSnapshotAt(input, canonicalPath);
  if (
    canonicalSnapshot.contents !== null &&
    canonicalSnapshot.contents !== skillContents &&
    !isUnmodifiedManagedAgentSkill(canonicalSnapshot.contents, '@transcend-io/cli')
  ) {
    throw new Error(
      `Refusing to replace user-managed skill: ${canonicalPath}. Apply the skill update manually.`,
    );
  }
  addFileChange(plan, input, {
    path: canonicalPath,
    contents: skillContents,
    description: 'Install the Transcend Custom Function authoring skill',
  });

  directories.aliases.forEach((directory) => {
    const targetDirectory = join(root, directory, CUSTOM_FUNCTION_SKILL_NAME);
    const snapshot = snapshotAt(input, targetDirectory);
    const relativeTarget = relative(dirname(targetDirectory), canonicalDirectory);
    if (snapshot.kind === 'link' && snapshot.target === relativeTarget) {
      plan.unchanged.push(targetDirectory);
      return;
    }
    if (snapshot.kind !== 'absent') {
      throw new Error(`Refusing to replace unexpected skill target: ${targetDirectory}`);
    }
    const change: PlannedLinkChange = {
      kind: 'link',
      path: targetDirectory,
      target: relativeTarget,
      fallbackContents: skillContents,
      description: `Expose the canonical skill in ${directory}`,
    };
    plan.changes.push(change);
  });
}

/**
 * Create the base plan and optional repository setup.
 *
 * @param input - Collected project state
 * @param options - Selected setup
 * @returns Validated project plan
 */
export function buildInitPlan(
  input: CustomFunctionInitPlanningInput,
  options: InitPlanOptions,
): CustomFunctionProjectPlan {
  const { state } = input;
  const plan: CustomFunctionProjectPlan = {
    version: CUSTOM_FUNCTION_RESULT_VERSION,
    command: 'init',
    targetDirectory: state.targetDirectory,
    manifestPath: state.manifestPath,
    changes: [],
    unchanged: [],
    warnings: [],
    nextSteps: [
      `transcend custom-functions new ${state.targetDirectory}`,
      `transcend custom-functions check ${state.targetDirectory}`,
    ],
  };
  const manifestSnapshot = fileSnapshotAt(input, state.manifestPath);
  if (manifestSnapshot.contents === null) {
    addFileChange(plan, input, {
      path: state.manifestPath,
      contents: EMPTY_CUSTOM_FUNCTION_MANIFEST,
      description: 'Create the Custom Function manifest',
    });
  } else {
    parseCustomFunctionsManifest(manifestSnapshot.contents);
    plan.unchanged.push(state.manifestPath);
  }

  const selected = new Set(options.features);
  if (selected.has(CustomFunctionSetupFeature.Deno)) {
    const snapshot = fileSnapshotAt(input, state.denoConfigPath);
    addFileChange(plan, input, {
      path: state.denoConfigPath,
      contents: mergeDenoConfiguration(snapshot.contents, input.contractVersion),
      description: 'Merge strict target-scoped Deno authoring configuration',
    });
  }

  const root = setupRoot(state);
  if (selected.has(CustomFunctionSetupFeature.Editor)) {
    const settingsPath = join(root, '.vscode', 'settings.json');
    const extensionsPath = join(root, '.vscode', 'extensions.json');
    const settingsSnapshot = fileSnapshotAt(input, settingsPath);
    const extensionsSnapshot = fileSnapshotAt(input, extensionsPath);
    addFileChange(plan, input, {
      path: settingsPath,
      contents: mergeEditorSettings(settingsSnapshot.contents, root, state.targetDirectory),
      description: 'Scope Deno language support to Custom Functions',
    });
    addFileChange(plan, input, {
      path: extensionsPath,
      contents: mergeEditorExtensions(extensionsSnapshot.contents),
      description: 'Recommend the Deno editor extension',
    });
  }

  if (selected.has(CustomFunctionSetupFeature.Skill)) {
    planSkill(plan, input);
  }
  if (selected.has(CustomFunctionSetupFeature.Ci)) {
    if (!state.repositoryRoot || !state.usesGithub) {
      plan.warnings.push(
        'GitHub Actions setup was selected, but this target is not inside a detected GitHub repository.',
      );
    } else {
      const workflowPath = join(
        state.repositoryRoot,
        '.github',
        'workflows',
        'transcend-custom-functions.yml',
      );
      const target =
        relative(state.repositoryRoot, state.targetDirectory).split(sep).join('/') || '.';
      const manifest = relative(state.repositoryRoot, state.manifestPath).split(sep).join('/');
      addFileChange(plan, input, {
        path: workflowPath,
        contents: generateGithubActionsWorkflow({
          cliVersion: input.cliVersion,
          targetDirectory: target,
          manifestPath: manifest,
        }),
        description: 'Add credential-free Custom Function checks',
      });
    }
  }
  validatePlanDestinations(
    state,
    plan.changes.map(({ path }) => path),
  );
  return plan;
}

/**
 * Add a new function to an initialized project in one transaction.
 *
 * @param input - Collected project state
 * @param options - Generated function
 * @returns Validated project plan
 */
export function buildAddFunctionPlan(
  input: CustomFunctionPlanningInput,
  options: {
    /** Generated function scaffold. */
    generated: GeneratedCustomFunctionTemplate;
  },
): CustomFunctionProjectPlan {
  const { state } = input;
  const currentManifest = fileSnapshotAt(input, state.manifestPath).contents;
  if (currentManifest === null) {
    throw new Error(`Custom Function manifest does not exist: ${state.manifestPath}`);
  }
  const plan: CustomFunctionProjectPlan = {
    version: CUSTOM_FUNCTION_RESULT_VERSION,
    command: 'new',
    targetDirectory: state.targetDirectory,
    manifestPath: state.manifestPath,
    changes: [],
    unchanged: [],
    warnings: [],
    nextSteps: [],
  };
  const updatedManifest = insertCustomFunctionManifestEntry(
    currentManifest,
    options.generated.manifestEntry,
  );
  addFileChange(plan, input, {
    path: state.manifestPath,
    contents: updatedManifest,
    description: `Register ${options.generated.displayName} in the manifest`,
  });

  const generatedFiles = [options.generated.sourceFile, ...options.generated.payloadFiles];
  generatedFiles.forEach((file) => {
    addFileChange(plan, input, {
      path: join(state.manifestDirectory, file.path),
      contents: file.contents,
      description:
        file === options.generated.sourceFile
          ? `Create ${options.generated.displayName} source`
          : `Create ${options.generated.displayName} test payload`,
      createOnly: true,
    });
  });
  const sourcePath = join(state.manifestDirectory, options.generated.sourceFile.path);
  plan.nextSteps = [
    `Edit ${sourcePath}`,
    `transcend custom-functions check ${state.targetDirectory}`,
    `transcend custom-functions push --file=${state.manifestPath} --dryRun`,
  ];
  if (options.generated.manifestEntry.env?.TRANSCEND_API_KEY) {
    plan.warnings.push(
      'Supply transcendApiKey through --variables when pushing; never commit the API key.',
    );
  }
  validatePlanDestinations(
    state,
    plan.changes.map(({ path }) => path),
  );
  return plan;
}

/**
 * Generate the template before collecting its destination snapshots.
 *
 * @param displayName - Custom Function display name
 * @param template - Template name
 * @returns Pure template output
 */
export function prepareGeneratedCustomFunction(
  displayName: string,
  template: Parameters<typeof generateCustomFunctionTemplate>[1],
): GeneratedCustomFunctionTemplate {
  return generateCustomFunctionTemplate(displayName, template);
}
