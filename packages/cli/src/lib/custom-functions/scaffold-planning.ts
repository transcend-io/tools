import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';

import {
  getManagedAgentSkillCandidatePaths,
  planManagedAgentSkill,
  type ManagedAgentSkillDefinition,
} from '../scaffolding/agent-skill.js';
import { displayProjectPath, quoteShellArgument } from '../scaffolding/project-plan-output.js';
import {
  getPlanningFileSnapshot,
  planFileChange,
  type PlanningPathSnapshot,
} from '../scaffolding/project-plan.js';
import {
  CUSTOM_FUNCTION_SKILL_FILES,
  CUSTOM_FUNCTION_SKILL_NAME,
} from './custom-function-skill.js';
import { insertCustomFunctionManifestEntry, parseCustomFunctionsManifest } from './manifest.js';
import { buildCustomFunctionProjectArguments, buildPlaceholderVariablesArgument } from './paths.js';
import {
  generateGithubActionsWorkflow,
  isUnmodifiedCustomFunctionWorkflow,
} from './scaffold-artifacts.js';
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
  generateCustomFunctionTemplate,
  type GeneratedCustomFunctionTemplate,
} from './scaffold-templates.js';

/** Empty manifest used for first initialization. */
export const EMPTY_CUSTOM_FUNCTION_MANIFEST = `# Custom Functions managed as code.
functions: []
`;

/** Managed Custom Function Agent Skill definition. */
const CUSTOM_FUNCTION_MANAGED_SKILL: ManagedAgentSkillDefinition = {
  name: CUSTOM_FUNCTION_SKILL_NAME,
  displayName: 'Custom Function',
  owner: '@transcend-io/cli',
  files: CUSTOM_FUNCTION_SKILL_FILES,
};

/** In-memory input consumed by pure project planners. */
export interface CustomFunctionPlanningInput {
  /** Project discovery state. */
  state: CustomFunctionProjectState;
  /** Potential mutation paths keyed by absolute path. */
  snapshots: Readonly<Record<string, PlanningPathSnapshot>>;
}

/**
 * Find parameter placeholders in a generated manifest value.
 *
 * @param value - Generated manifest entry
 * @returns Unique parameter names in encounter order
 */
export function parameterNamesInManifestValue(value: unknown): string[] {
  const serialized = JSON.stringify(value) ?? '';
  return [
    ...new Set(Array.from(serialized.matchAll(/<<parameters\.([^>]+)>>/gu), (match) => match[1]!)),
  ];
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
  return state.projectRoot;
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
    getManagedAgentSkillCandidatePaths(
      root,
      state.existingSkillDirectories,
      CUSTOM_FUNCTION_MANAGED_SKILL,
    ).forEach((path) => paths.add(path));
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
    const components = relativePath.split('/');
    for (let length = 1; length <= components.length; length += 1) {
      const candidate = components.slice(0, length).join('/');
      const collision = existing.get(candidate.toLocaleLowerCase('en-US'));
      if (collision && collision !== candidate) {
        throw new Error(
          `Case-insensitive path collision: "${candidate}" conflicts with "${collision}".`,
        );
      }
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
  const projectArguments = buildCustomFunctionProjectArguments(
    state.targetDirectory,
    state.manifestPath,
    state.invocationDirectory,
  );
  const plan: CustomFunctionProjectPlan = {
    version: CUSTOM_FUNCTION_RESULT_VERSION,
    command: 'init',
    rootDirectory: setupRoot(state),
    targetDirectory: state.targetDirectory,
    manifestPath: state.manifestPath,
    changes: [],
    unchanged: [],
    warnings: [],
    nextSteps: [
      `transcend custom-functions new ${projectArguments}`,
      `transcend custom-functions check ${projectArguments}`,
    ],
  };
  const manifestSnapshot = getPlanningFileSnapshot(input.snapshots, state.manifestPath);
  const existingManifest =
    manifestSnapshot.contents === null
      ? undefined
      : parseCustomFunctionsManifest(manifestSnapshot.contents);
  if (manifestSnapshot.contents === null) {
    addFileChange(plan, input, {
      path: state.manifestPath,
      contents: EMPTY_CUSTOM_FUNCTION_MANIFEST,
      description: 'Create the Custom Function manifest',
    });
  } else {
    plan.unchanged.push(state.manifestPath);
  }

  const selected = new Set(options.features);
  if (selected.has(CustomFunctionSetupFeature.Deno)) {
    const snapshot = getPlanningFileSnapshot(input.snapshots, state.denoConfigPath);
    const sourcePaths = (existingManifest?.functions ?? [])
      .map(({ code }) => code)
      .filter((path) => !path.includes('<<parameters.'));
    const payloadPaths = (existingManifest?.functions ?? [])
      .flatMap((entry) => [
        ...(entry['test-payload'] ? [entry['test-payload']] : []),
        ...(entry['test-payloads'] ?? []).map(({ payload }) => payload),
      ])
      .filter((path) => !path.includes('<<parameters.'));
    addFileChange(plan, input, {
      path: state.denoConfigPath,
      contents: mergeDenoConfiguration(
        snapshot.contents,
        input.contractVersion,
        basename(state.manifestPath),
        { sources: sourcePaths, payloads: payloadPaths },
      ),
      description: 'Merge strict target-scoped Deno authoring configuration',
    });
  }

  const root = setupRoot(state);
  if (selected.has(CustomFunctionSetupFeature.Editor)) {
    const settingsPath = join(root, '.vscode', 'settings.json');
    const extensionsPath = join(root, '.vscode', 'extensions.json');
    const settingsSnapshot = getPlanningFileSnapshot(input.snapshots, settingsPath);
    const extensionsSnapshot = getPlanningFileSnapshot(input.snapshots, extensionsPath);
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
    const skillPlan = planManagedAgentSkill({
      rootDirectory: root,
      existingDirectories: state.existingSkillDirectories,
      snapshots: input.snapshots,
      skill: CUSTOM_FUNCTION_MANAGED_SKILL,
    });
    plan.changes.push(...skillPlan.changes);
    plan.unchanged.push(...skillPlan.unchanged);
    plan.warnings.push(...skillPlan.warnings);
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
      const contentDirectory =
        relative(state.repositoryRoot, state.manifestDirectory).split(sep).join('/') || '.';
      const manifest = relative(state.repositoryRoot, state.manifestPath).split(sep).join('/');
      const watchedPaths = (existingManifest?.functions ?? [])
        .flatMap((entry) => [
          entry.code,
          ...(entry['test-payload'] ? [entry['test-payload']] : []),
          ...(entry['test-payloads'] ?? []).map(({ payload }) => payload),
        ])
        .filter((path) => !path.includes('<<parameters.'))
        .map((path) =>
          relative(state.repositoryRoot!, resolve(state.manifestDirectory, path))
            .split(sep)
            .join('/'),
        );
      const workflowContents = generateGithubActionsWorkflow({
        cliVersion: input.cliVersion,
        targetDirectory: target,
        contentDirectory,
        manifestPath: manifest,
        watchedPaths,
      });
      const workflowSnapshot = getPlanningFileSnapshot(input.snapshots, workflowPath);
      if (workflowSnapshot.contents === null) {
        addFileChange(plan, input, {
          path: workflowPath,
          contents: workflowContents,
          description: 'Add credential-free Custom Function checks',
          createOnly: true,
        });
      } else if (workflowSnapshot.contents === workflowContents) {
        plan.unchanged.push(workflowPath);
      } else if (isUnmodifiedCustomFunctionWorkflow(workflowSnapshot.contents)) {
        addFileChange(plan, input, {
          path: workflowPath,
          contents: workflowContents,
          description: 'Update managed Custom Function checks',
        });
      } else {
        plan.unchanged.push(workflowPath);
        plan.warnings.push(`Existing GitHub Actions workflow was left unchanged: ${workflowPath}`);
      }
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
  const currentManifest = getPlanningFileSnapshot(input.snapshots, state.manifestPath).contents;
  if (currentManifest === null) {
    throw new Error(`Custom Function manifest does not exist: ${state.manifestPath}`);
  }
  const sourceRelativePath = options.generated.sourceFile.path.split(sep).join('/');
  const sourceCollision = state.relativePaths.find(
    (path) => path.toLocaleLowerCase('en-US') === sourceRelativePath.toLocaleLowerCase('en-US'),
  );
  if (sourceCollision) {
    throw new Error(
      `Custom Function name "${options.generated.displayName}" maps to ${sourceRelativePath}, ` +
        `which conflicts with existing path ${sourceCollision}. Choose another name.`,
    );
  }
  const existingSourceEntry = parseCustomFunctionsManifest(currentManifest).functions.find(
    (entry) =>
      resolve(state.manifestDirectory, entry.code) ===
      resolve(state.manifestDirectory, sourceRelativePath),
  );
  if (existingSourceEntry) {
    throw new Error(
      `Custom Function name "${options.generated.displayName}" maps to source used by ` +
        `"${existingSourceEntry.name}". Choose another name.`,
    );
  }
  const plan: CustomFunctionProjectPlan = {
    version: CUSTOM_FUNCTION_RESULT_VERSION,
    command: 'new',
    rootDirectory: state.manifestDirectory,
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
  const projectArguments = buildCustomFunctionProjectArguments(
    state.targetDirectory,
    state.manifestPath,
    state.invocationDirectory,
  );
  const variableNames = parameterNamesInManifestValue(options.generated.manifestEntry);
  const variablesArgument = buildPlaceholderVariablesArgument(variableNames);
  plan.nextSteps = [
    `Edit ${quoteShellArgument(displayProjectPath(state.invocationDirectory, sourcePath))}`,
    `transcend custom-functions run ${projectArguments} --function=${quoteShellArgument(
      options.generated.displayName,
    )}${variablesArgument}`,
    `transcend custom-functions check ${projectArguments}${variablesArgument}`,
    `transcend custom-functions push --file=${quoteShellArgument(
      displayProjectPath(state.invocationDirectory, state.manifestPath),
    )} --dryRun${variablesArgument}`,
  ];
  if (variableNames.length > 0) {
    plan.warnings.push(
      `Supply ${variableNames.join(', ')} through --variables when running or pushing; never commit secret values.`,
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
