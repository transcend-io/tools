import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { resolveCommand } from 'package-manager-detector/commands';

import type { LocalContext } from '../../../context.js';
import {
  insertCustomFunctionManifestEntry,
  parseCustomFunctionsManifest,
} from '../../../lib/custom-functions/manifest.js';
import {
  appendGitignoreEntry,
  generateGithubActionsWorkflow,
  generateSecretNamesFile,
} from './artifacts.js';
import {
  AGENT_SKILL_TARGETS,
  mergeDenoConfiguration,
  mergeEditorExtensions,
  mergeEditorSettings,
} from './config.js';
import type { CustomFunctionProjectState } from './discovery.js';
import {
  CUSTOM_FUNCTION_RESULT_VERSION,
  CustomFunctionSetupFeature,
  hashContents,
  planFileChange,
  type CustomFunctionProjectPlan,
  type CustomFunctionSetupFeature as CustomFunctionSetupFeatureType,
  type PlannedChange,
  type PlannedCommandChange,
  type PlannedLinkChange,
  type ProjectFileSnapshot,
} from './model.js';
import {
  CUSTOM_FUNCTION_SKILL_MD,
  generateCustomFunctionTemplate,
  type GeneratedCustomFunctionTemplate,
} from './templates.js';

/** Marker prefix used to identify canonical skill files owned by this CLI. */
const MANAGED_SKILL_MARKER_PREFIX = '<!-- managed-by: @transcend-io/cli; content-sha256: ';

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
 * Candidate lockfiles for command rollback.
 *
 * @param state - Discovery state
 * @returns Absolute paths
 */
function packageManagerLockfiles(state: CustomFunctionProjectState): string[] {
  const root = setupRoot(state);
  switch (state.packageManager?.name) {
    case 'npm':
      return [join(root, 'package-lock.json'), join(root, 'npm-shrinkwrap.json')];
    case 'pnpm':
      return [join(root, 'pnpm-lock.yaml')];
    case 'yarn':
      return [join(root, 'yarn.lock')];
    case 'bun':
      return [join(root, 'bun.lock'), join(root, 'bun.lockb')];
    default:
      return [];
  }
}

/**
 * Select the canonical skill directory and any existing alias directories.
 *
 * @param state - Discovery state
 * @returns Canonical and alias skill directories
 */
function skillDirectories(state: CustomFunctionProjectState): {
  /** Directory containing the managed skill file. */
  canonical: string;
  /** Existing directories that should link to the canonical skill. */
  aliases: string[];
} | null {
  if (state.existingSkillDirectories.length === 0) {
    return null;
  }
  const universal = AGENT_SKILL_TARGETS.find(({ id }) => id === 'universal')!.skillsDirectory;
  if (state.existingSkillDirectories.length === 1) {
    return { canonical: state.existingSkillDirectories[0]!, aliases: [] };
  }
  return {
    canonical: universal,
    aliases:
      state.existingSkillDirectories.length > 1
        ? state.existingSkillDirectories.filter((directory) => directory !== universal)
        : [],
  };
}

/**
 * Enumerate all paths that could be included in a plan.
 *
 * @param state - Discovery state
 * @param options - Selected setup and optional scaffold
 * @returns Absolute candidate paths
 */
export function getPlanningCandidatePaths(
  state: CustomFunctionProjectState,
  options: {
    /** Selected setup features. */
    features: readonly CustomFunctionSetupFeatureType[];
    /** Optional generated function. */
    generated?: GeneratedCustomFunctionTemplate;
  },
): string[] {
  const root = setupRoot(state);
  const paths = new Set<string>([state.manifestPath]);
  const selected = new Set(options.features);
  if (
    selected.has(CustomFunctionSetupFeature.Deno) ||
    selected.has(CustomFunctionSetupFeature.Tasks)
  ) {
    paths.add(state.denoConfigPath);
  }
  if (selected.has(CustomFunctionSetupFeature.Editor)) {
    paths.add(join(root, '.vscode', 'settings.json'));
    paths.add(join(root, '.vscode', 'extensions.json'));
  }
  if (selected.has(CustomFunctionSetupFeature.Skill)) {
    const directories = skillDirectories(state);
    if (directories) {
      paths.add(join(root, directories.canonical, 'transcend-custom-functions', 'SKILL.md'));
      directories.aliases.forEach((directory) => {
        paths.add(join(root, directory, 'transcend-custom-functions'));
      });
    }
  }
  if (selected.has(CustomFunctionSetupFeature.Ci)) {
    paths.add(join(root, '.github', 'workflows', 'transcend-custom-functions.yml'));
  }
  if (selected.has(CustomFunctionSetupFeature.SecretDocs)) {
    paths.add(join(state.manifestDirectory, '.env.custom-functions.example'));
    paths.add(join(state.manifestDirectory, '.gitignore'));
  }
  if (selected.has(CustomFunctionSetupFeature.PackageManager) && state.packageJsonPath) {
    paths.add(state.packageJsonPath);
    packageManagerLockfiles(state).forEach((path) => paths.add(path));
  }
  if (options.generated) {
    paths.add(join(state.manifestDirectory, options.generated.sourceFile.path));
    options.generated.payloadFiles.forEach((file) =>
      paths.add(join(state.manifestDirectory, file.path)),
    );
  }
  return [...paths].sort((left, right) => left.localeCompare(right));
}

/**
 * Collect candidate paths once, before preview.
 *
 * @param context - CLI context
 * @param paths - Absolute paths
 * @returns In-memory path snapshots
 */
export function collectPlanningSnapshots(
  context: LocalContext,
  paths: readonly string[],
): Readonly<Record<string, PlanningPathSnapshot>> {
  return Object.fromEntries(
    paths.map((path): [string, PlanningPathSnapshot] => {
      try {
        const stat = context.fs.lstatSync(path);
        if (stat.isSymbolicLink()) {
          return [path, { kind: 'link', path, target: context.fs.readlinkSync(path) }];
        }
        if (stat.isDirectory()) {
          return [path, { kind: 'directory', path }];
        }
        if (!stat.isFile()) {
          throw new Error(`Unsupported filesystem entry: ${path}`);
        }
        return [
          path,
          {
            kind: 'file',
            path,
            contents: context.fs.readFileSync(path, 'utf8'),
            mode: stat.mode,
          },
        ];
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return [path, { kind: 'absent', path }];
        }
        throw error;
      }
    }),
  );
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
 * Ensure a generated skill contains its management marker.
 *
 * @returns Managed skill contents
 */
function managedSkillContents(): string {
  const body = CUSTOM_FUNCTION_SKILL_MD.trimEnd();
  return `${body}\n\n${MANAGED_SKILL_MARKER_PREFIX}${hashContents(body)} -->\n`;
}

/**
 * Verify that a previously managed skill still matches its recorded digest.
 *
 * @param contents - Existing skill contents
 * @returns Whether an automatic managed update is safe
 */
function isUnmodifiedManagedSkill(contents: string): boolean {
  const marker = contents.match(
    /<!-- managed-by: @transcend-io\/cli; content-sha256: ([a-f0-9]{64}) -->\s*$/u,
  );
  if (!marker || marker.index === undefined) {
    return false;
  }
  return hashContents(contents.slice(0, marker.index).trimEnd()) === marker[1];
}

/**
 * Plan one direct skill installation and links into other existing directories.
 *
 * @param plan - Plan being assembled
 * @param input - Planning input
 */
function planSkill(plan: CustomFunctionProjectPlan, input: CustomFunctionPlanningInput): void {
  const root = setupRoot(input.state);
  const directories = skillDirectories(input.state);
  if (!directories) {
    plan.warnings.push(
      'Skipped the coding-agent skill because this repository has no existing skill directory.',
    );
    return;
  }
  const canonicalDirectory = join(root, directories.canonical, 'transcend-custom-functions');
  const canonicalPath = join(canonicalDirectory, 'SKILL.md');
  const skillContents = managedSkillContents();
  const canonicalSnapshot = fileSnapshotAt(input, canonicalPath);
  if (
    canonicalSnapshot.contents !== null &&
    canonicalSnapshot.contents !== skillContents &&
    !isUnmodifiedManagedSkill(canonicalSnapshot.contents)
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
    const targetDirectory = join(root, directory, 'transcend-custom-functions');
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
 * Read parsed package metadata.
 *
 * @param input - Planning input
 * @returns Package metadata
 */
function readPackageJson(input: CustomFunctionPlanningInput): Record<string, unknown> | undefined {
  if (!input.state.packageJsonPath) {
    return undefined;
  }
  const snapshot = fileSnapshotAt(input, input.state.packageJsonPath);
  if (snapshot.contents === null) {
    return undefined;
  }
  try {
    return JSON.parse(snapshot.contents) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Cannot read ${input.state.packageJsonPath}: ${(error as Error).message}`);
  }
}

/**
 * Plan a package-manager command using only repository evidence.
 *
 * @param plan - Plan being assembled
 * @param input - Planning input
 */
function planPackageManager(
  plan: CustomFunctionProjectPlan,
  input: CustomFunctionPlanningInput,
): void {
  const packageJson = readPackageJson(input);
  const packageJsonPath = input.state.packageJsonPath;
  const packageManager = input.state.packageManager;
  if (!packageJson || !packageJsonPath || !packageManager) {
    plan.warnings.push(
      'No repository package manager was detected; install the exact custom-function-types version manually.',
    );
    return;
  }
  const dependencyName = '@transcend-io/custom-function-types';
  const dependencies = {
    ...((packageJson.dependencies as Record<string, unknown> | undefined) ?? {}),
    ...((packageJson.devDependencies as Record<string, unknown> | undefined) ?? {}),
  };
  if (dependencies[dependencyName] === input.contractVersion) {
    plan.unchanged.push(packageJsonPath);
    return;
  }
  const resolved = resolveCommand(packageManager.agent, 'add', [
    ...(input.state.pnpmWorkspaceRoot ? ['--workspace-root'] : []),
    '--save-dev',
    `${dependencyName}@${input.contractVersion}`,
  ]);
  if (!resolved) {
    plan.warnings.push(
      `Detected ${packageManager.agent}, but could not resolve its add command. Install ${dependencyName}@${input.contractVersion} manually.`,
    );
    return;
  }
  const rollbackPaths = [packageJsonPath, ...packageManagerLockfiles(input.state)];
  const change: PlannedCommandChange = {
    kind: 'command',
    command: resolved.command,
    args: resolved.args,
    cwd: setupRoot(input.state),
    description: `install ${dependencyName}@${input.contractVersion}`,
    rollbackFiles: rollbackPaths.map((path) => {
      const snapshot = fileSnapshotAt(input, path);
      return { path, before: snapshot.contents };
    }),
  };
  plan.changes.push(change);
}

/**
 * Create the base plan and optional repository setup.
 *
 * @param input - Collected project state
 * @param options - Selected setup
 * @returns Validated project plan
 */
export function buildInitPlan(
  input: CustomFunctionPlanningInput,
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
  if (
    selected.has(CustomFunctionSetupFeature.Deno) ||
    selected.has(CustomFunctionSetupFeature.Tasks)
  ) {
    const snapshot = fileSnapshotAt(input, state.denoConfigPath);
    addFileChange(plan, input, {
      path: state.denoConfigPath,
      contents: mergeDenoConfiguration(
        snapshot.contents,
        input.contractVersion,
        selected.has(CustomFunctionSetupFeature.Tasks),
      ),
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
  if (selected.has(CustomFunctionSetupFeature.PackageManager)) {
    planPackageManager(plan, input);
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
        description: 'Add credential-free checks and an explicitly gated deployment',
      });
    }
  }
  if (selected.has(CustomFunctionSetupFeature.SecretDocs)) {
    const examplePath = join(state.manifestDirectory, '.env.custom-functions.example');
    const gitignorePath = join(state.manifestDirectory, '.gitignore');
    const gitignoreSnapshot = fileSnapshotAt(input, gitignorePath);
    addFileChange(plan, input, {
      path: examplePath,
      contents: generateSecretNamesFile(),
      description: 'Document required secret names without values',
    });
    addFileChange(plan, input, {
      path: gitignorePath,
      contents: appendGitignoreEntry(gitignoreSnapshot.contents, '.env.custom-functions'),
      description: 'Ignore the local Custom Function secret file',
    });
  }

  validatePlanDestinations(
    state,
    plan.changes
      .filter(
        (change): change is Exclude<PlannedChange, PlannedCommandChange> =>
          change.kind !== 'command',
      )
      .map(({ path }) => path),
  );
  return plan;
}

/**
 * Compose a new function with any missing initialization in one transaction.
 *
 * @param input - Collected project state
 * @param options - Template and setup choices
 * @returns Validated project plan
 */
export function buildNewPlan(
  input: CustomFunctionPlanningInput,
  options: InitPlanOptions & {
    /** Generated function scaffold. */
    generated: GeneratedCustomFunctionTemplate;
  },
): CustomFunctionProjectPlan {
  const plan = buildInitPlan(input, options);
  plan.command = 'new';
  const { state } = input;
  const manifestChangeIndex = plan.changes.findIndex(
    (change) => change.kind === 'file' && change.path === state.manifestPath,
  );
  const currentManifest =
    manifestChangeIndex >= 0
      ? (plan.changes[manifestChangeIndex] as Extract<PlannedChange, { kind: 'file' }>).after
      : fileSnapshotAt(input, state.manifestPath).contents!;
  const updatedManifest = insertCustomFunctionManifestEntry(
    currentManifest,
    options.generated.manifestEntry,
  );
  if (manifestChangeIndex >= 0) {
    const current = plan.changes[manifestChangeIndex] as Extract<PlannedChange, { kind: 'file' }>;
    plan.changes[manifestChangeIndex] = { ...current, after: updatedManifest };
  } else {
    plan.unchanged = plan.unchanged.filter((path) => path !== state.manifestPath);
    addFileChange(plan, input, {
      path: state.manifestPath,
      contents: updatedManifest,
      description: `Register ${options.generated.displayName} in the manifest`,
    });
  }

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
    plan.changes
      .filter(
        (change): change is Exclude<PlannedChange, PlannedCommandChange> =>
          change.kind !== 'command',
      )
      .map(({ path }) => path),
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
