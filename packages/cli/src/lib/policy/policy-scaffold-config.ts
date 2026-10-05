import { relative, sep } from 'node:path';

import {
  mergeJsonc,
  mergeStringArray,
  parseJsoncObject,
  type JsoncUpdate,
} from '../scaffolding/jsonc.js';
import {
  buildBundleDirectoryName,
  PERMISSIONS_POLICY_INPUT_SCHEMA_ID,
  POLICY_INPUT_SCHEMA_FILENAME,
  POLICY_MANIFEST_FILENAME,
  POLICY_STARTER_ROOT,
  PolicyTemplate,
  type PolicyTemplateName,
} from './policy-scaffold-templates.js';

/** Recommended VS Code extension for OPA and Regal authoring. */
export const POLICY_VSCODE_EXTENSION = 'tsandall.opa';

/** Conflicting syntax-only VS Code extension. */
export const CONFLICTING_POLICY_VSCODE_EXTENSION = 'glebbash.opa-highlight-only';

/**
 * Local publish unit: Rego package root plus its workspace-relative folder basename.
 *
 * `bundleDir` is not required to be `{root}-bundle` — `policy new --bundle-dir` may override it.
 */
export interface PolicyBundleRef {
  /** Package-path root (`.manifest` / Regal `project.roots`). */
  root: string;
  /** Basename of the publish directory under the policy workspace. */
  bundleDir: string;
  /**
   * Scaffold template that produced this bundle, when known.
   *
   * Permissions bundles point VS Code `json.schemas` at the published input
   * schema `$id` so editor validation tracks the live contract.
   */
  template?: PolicyTemplateName;
}

/**
 * Build a bundle ref with the default `{root}-bundle` directory.
 *
 * @param root - Package root
 * @param template - Optional scaffold template
 * @returns Bundle ref
 */
export function policyBundleRef(root: string, template?: PolicyTemplateName): PolicyBundleRef {
  return template === undefined
    ? { root, bundleDir: buildBundleDirectoryName(root) }
    : { root, bundleDir: buildBundleDirectoryName(root), template };
}

/** Result of safely merging one repository editor artifact. */
export interface PolicyEditorMergeResult {
  /** Complete merged contents, or the unchanged original when unsafe. */
  contents: string;
  /** Actionable preservation warnings. */
  warnings: string[];
}

/** One desired scalar setting that must not replace a customization. */
interface DesiredSetting {
  /** JSONC object path. */
  path: string[];
  /** Desired generated value. */
  value: unknown;
  /** Human-readable setting key. */
  label: string;
}

/**
 * Compare JSON-compatible configuration values.
 *
 * @param left - Existing value
 * @param right - Desired value
 * @returns Whether the values are structurally equal
 */
function configurationValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Parse an editor object while preserving malformed existing content.
 *
 * @param contents - Existing JSONC, or null
 * @param label - Configuration label
 * @returns Parsed object or a preservation result
 */
function parseEditorObject(
  contents: string | null,
  label: string,
):
  | {
      /** Parsed JSONC object. */
      current: Record<string, unknown>;
    }
  | {
      /** Complete unchanged contents. */
      contents: string;
      /** Actionable warning. */
      warning: string;
    } {
  try {
    return { current: parseJsoncObject(contents ?? '{}\n', label) };
  } catch (error) {
    return {
      contents: contents ?? '{}\n',
      warning: `${error instanceof Error ? error.message : String(error)} Existing content was left unchanged.`,
    };
  }
}

/**
 * Apply safe JSONC updates or preserve the existing file when comments prevent it.
 *
 * @param contents - Existing JSONC
 * @param updates - Proven-safe updates
 * @param label - Configuration label
 * @param warnings - Existing merge warnings
 * @returns Complete contents and warnings
 */
function applyEditorUpdates(
  contents: string | null,
  updates: readonly JsoncUpdate[],
  label: string,
  warnings: string[],
): PolicyEditorMergeResult {
  if (updates.length === 0) {
    return { contents: contents ?? '{}\n', warnings };
  }
  try {
    return {
      contents: mergeJsonc(contents, updates, label),
      warnings,
    };
  } catch (error) {
    return {
      contents: contents ?? '{}\n',
      warnings: [
        ...warnings,
        `${error instanceof Error ? error.message : String(error)} Existing content was left unchanged.`,
      ],
    };
  }
}

/**
 * Add absent scalar settings without replacing repository customizations.
 *
 * @param current - Parsed editor object
 * @param desired - Desired settings
 * @param updates - Safe updates to append to
 * @param warnings - Conflict warnings to append to
 */
function collectSafeScalarUpdates(
  current: Record<string, unknown>,
  desired: readonly DesiredSetting[],
  updates: JsoncUpdate[],
  warnings: string[],
): void {
  desired.forEach(({ path, value, label }) => {
    const existing = path.reduce<unknown>((parent, key) => {
      return parent && typeof parent === 'object' && !Array.isArray(parent)
        ? (parent as Record<string, unknown>)[key]
        : undefined;
    }, current);
    if (existing === undefined) {
      updates.push({ path, value });
    } else if (!configurationValuesEqual(existing, value)) {
      warnings.push(
        `VS Code setting "${label}" has a repository-specific value and was left unchanged.`,
      );
    }
  });
}

/**
 * Build a `${workspaceFolder}/…` path for a repository-relative POSIX path.
 *
 * @param repositoryRelativePath - Path relative to the repository root
 * @returns VS Code workspace path
 */
function buildWorkspaceFolderPath(repositoryRelativePath: string): string {
  return repositoryRelativePath === '.'
    ? '${workspaceFolder}'
    : `\${workspaceFolder}/${repositoryRelativePath}`;
}

/**
 * Repository-relative POSIX path from the root that owns `.vscode`.
 *
 * @param repositoryRoot - Root that owns `.vscode`
 * @param absolutePath - Absolute path below the repository
 * @returns POSIX repository-relative path
 */
function repositoryRelativePosix(repositoryRoot: string, absolutePath: string): string {
  return relative(repositoryRoot, absolutePath).split(sep).join('/') || '.';
}

/**
 * Build the workspace-relative OPA publish root for a bundle.
 *
 * @param repositoryRoot - Root that owns `.vscode`
 * @param workspaceDirectory - Selected policy workspace directory
 * @param bundle - Package root and local directory basename
 * @returns VS Code workspace path
 */
function buildOpaBundleRoot(
  repositoryRoot: string,
  workspaceDirectory: string,
  bundle: PolicyBundleRef = policyBundleRef(POLICY_STARTER_ROOT),
): string {
  const workspace = repositoryRelativePosix(repositoryRoot, workspaceDirectory);
  const path = workspace === '.' ? bundle.bundleDir : `${workspace}/${bundle.bundleDir}`;
  return buildWorkspaceFolderPath(path);
}

/**
 * Build a `files.associations` glob for every `.manifest` under the workspace.
 *
 * Patterns that contain `/` are matched against the absolute file path, so a
 * leading `**\/` prefix is required for a portable workspace-relative association.
 *
 * @param repositoryRoot - Root that owns `.vscode`
 * @param workspaceDirectory - Selected policy workspace directory
 * @returns Association pattern key
 */
function buildPolicyManifestAssociationPattern(
  repositoryRoot: string,
  workspaceDirectory: string,
): string {
  const workspace = repositoryRelativePosix(repositoryRoot, workspaceDirectory);
  return workspace === '.'
    ? `**/${POLICY_MANIFEST_FILENAME}`
    : `**/${workspace}/**/${POLICY_MANIFEST_FILENAME}`;
}

/**
 * Build `json.schemas` fileMatch globs for a bundle's input documents.
 *
 * Permissions templates use the published schema `$id` so VS Code validation
 * tracks the live contract. Generic bundles use the local `input.schema.json`
 * (OPA / offline tooling still always use the local file via `--schema`).
 *
 * @param repositoryRoot - Root that owns `.vscode`
 * @param workspaceDirectory - Selected policy workspace directory
 * @param bundle - Package root and local directory basename
 * @returns Absolute-style fileMatch paths and schema URL
 */
function buildBundleInputJsonSchema(
  repositoryRoot: string,
  workspaceDirectory: string,
  bundle: PolicyBundleRef = policyBundleRef(POLICY_STARTER_ROOT),
): {
  /** VS Code fileMatch globs (leading slash = workspace-relative). */
  fileMatch: string[];
  /** Schema URL (local path or published Permissions `$id`). */
  url: string;
} {
  const workspace = repositoryRelativePosix(repositoryRoot, workspaceDirectory);
  const bundlePrefix =
    workspace === '.' ? `/${bundle.bundleDir}` : `/${workspace}/${bundle.bundleDir}`;
  const schemaUrl =
    bundle.template === PolicyTemplate.Permissions
      ? PERMISSIONS_POLICY_INPUT_SCHEMA_ID
      : workspace === '.'
        ? `./${bundle.bundleDir}/${POLICY_INPUT_SCHEMA_FILENAME}`
        : `./${workspace}/${bundle.bundleDir}/${POLICY_INPUT_SCHEMA_FILENAME}`;
  return {
    fileMatch: [`${bundlePrefix}/input.json`, `${bundlePrefix}/input.example.json`],
    url: schemaUrl,
  };
}

/**
 * Merge strict workspace-scoped OPA and Rego editor settings.
 *
 * Setting names match the authoritative `open-policy-agent/vscode-opa`
 * extension metadata. Existing conflicting values are preserved and reported.
 *
 * When `bundles` is provided, `opa.roots` and `json.schemas` are populated
 * for those bundles. When omitted (init without bundles), `opa.roots` and
 * `json.schemas` are left empty or unset.
 *
 * @param contents - Existing `.vscode/settings.json` JSONC
 * @param repositoryRoot - Root that owns `.vscode`
 * @param workspaceDirectory - Selected policy workspace directory
 * @param bundles - Local publish units to add to `opa.roots` and `json.schemas`
 * @returns Merged settings and conflict warnings
 */
export function mergePolicyEditorSettings(
  contents: string | null,
  repositoryRoot: string,
  workspaceDirectory: string,
  bundles?: readonly PolicyBundleRef[],
): PolicyEditorMergeResult {
  const parsed = parseEditorObject(contents, 'VS Code policy settings');
  if ('warning' in parsed) {
    return { contents: parsed.contents, warnings: [parsed.warning] };
  }
  const { current } = parsed;
  const updates: JsoncUpdate[] = [];
  const warnings: string[] = [];

  if (bundles && bundles.length > 0) {
    const roots = current['opa.roots'];
    const desiredRoots = bundles.map((bundle) =>
      buildOpaBundleRoot(repositoryRoot, workspaceDirectory, bundle),
    );
    if (roots === undefined) {
      updates.push({ path: ['opa.roots'], value: desiredRoots });
    } else if (Array.isArray(roots) && roots.every((value) => typeof value === 'string')) {
      const merged = mergeStringArray(roots, desiredRoots);
      if (!configurationValuesEqual(merged, roots)) {
        updates.push({ path: ['opa.roots'], value: merged });
      }
    } else {
      warnings.push('VS Code setting "opa.roots" is customized and was left unchanged.');
    }
  }

  collectSafeScalarUpdates(
    current,
    [
      { path: ['opa.checkOnSave'], value: true, label: 'opa.checkOnSave' },
      { path: ['opa.strictMode'], value: true, label: 'opa.strictMode' },
      { path: ['opa.bundleMode'], value: true, label: 'opa.bundleMode' },
      { path: ['opa.formatter'], value: 'opa-fmt-rego-v1', label: 'opa.formatter' },
    ],
    updates,
    warnings,
  );

  const associations = current['files.associations'];
  const manifestAssociation = buildPolicyManifestAssociationPattern(
    repositoryRoot,
    workspaceDirectory,
  );
  if (associations === undefined) {
    updates.push({
      path: ['files.associations'],
      value: { [manifestAssociation]: 'json' },
    });
  } else if (
    associations !== null &&
    typeof associations === 'object' &&
    !Array.isArray(associations)
  ) {
    collectSafeScalarUpdates(
      current,
      [
        {
          path: ['files.associations', manifestAssociation],
          value: 'json',
          label: `files.associations."${manifestAssociation}"`,
        },
      ],
      updates,
      warnings,
    );
  } else {
    warnings.push('VS Code setting "files.associations" is customized and was left unchanged.');
  }

  if (bundles && bundles.length > 0) {
    const desiredJsonSchemas = bundles.map((bundle) =>
      buildBundleInputJsonSchema(repositoryRoot, workspaceDirectory, bundle),
    );
    const jsonSchemas = current['json.schemas'];
    if (jsonSchemas === undefined) {
      updates.push({ path: ['json.schemas'], value: desiredJsonSchemas });
    } else if (Array.isArray(jsonSchemas)) {
      let merged = [...jsonSchemas];
      desiredJsonSchemas.forEach((desired) => {
        const hasExactMatch = merged.some(
          (entry) =>
            entry !== null &&
            typeof entry === 'object' &&
            !Array.isArray(entry) &&
            configurationValuesEqual(entry, desired),
        );
        if (hasExactMatch) {
          return;
        }
        const sameUrlIndex = merged.findIndex(
          (entry) =>
            entry !== null &&
            typeof entry === 'object' &&
            !Array.isArray(entry) &&
            typeof (entry as Record<string, unknown>).url === 'string' &&
            (entry as Record<string, unknown>).url === desired.url,
        );
        if (sameUrlIndex === -1) {
          merged = [...merged, desired];
          return;
        }
        const existing = merged[sameUrlIndex] as Record<string, unknown>;
        const existingMatches = existing.fileMatch;
        if (
          !Array.isArray(existingMatches) ||
          !existingMatches.every((m) => typeof m === 'string')
        ) {
          warnings.push(
            `VS Code setting "json.schemas" has a repository-specific entry for the ${desired.url} schema and was left unchanged.`,
          );
          return;
        }
        const unioned = mergeStringArray(existingMatches, desired.fileMatch);
        if (!configurationValuesEqual(unioned, existingMatches)) {
          merged = merged.map((entry, index) =>
            index === sameUrlIndex ? { ...existing, fileMatch: unioned } : entry,
          );
        }
      });
      if (!configurationValuesEqual(merged, jsonSchemas)) {
        updates.push({ path: ['json.schemas'], value: merged });
      }
    } else {
      warnings.push('VS Code setting "json.schemas" is customized and was left unchanged.');
    }
  }

  const regoSettings = current['[rego]'];
  if (regoSettings === undefined) {
    updates.push({
      path: ['[rego]'],
      value: {
        'editor.defaultFormatter': POLICY_VSCODE_EXTENSION,
        'editor.formatOnSave': true,
        'editor.insertSpaces': false,
        'editor.tabSize': 4,
      },
    });
  } else if (
    regoSettings !== null &&
    typeof regoSettings === 'object' &&
    !Array.isArray(regoSettings)
  ) {
    collectSafeScalarUpdates(
      current,
      [
        {
          path: ['[rego]', 'editor.defaultFormatter'],
          value: POLICY_VSCODE_EXTENSION,
          label: '[rego].editor.defaultFormatter',
        },
        {
          path: ['[rego]', 'editor.formatOnSave'],
          value: true,
          label: '[rego].editor.formatOnSave',
        },
        {
          path: ['[rego]', 'editor.insertSpaces'],
          value: false,
          label: '[rego].editor.insertSpaces',
        },
        {
          path: ['[rego]', 'editor.tabSize'],
          value: 4,
          label: '[rego].editor.tabSize',
        },
      ],
      updates,
      warnings,
    );
  } else {
    warnings.push('VS Code language setting "[rego]" is customized and was left unchanged.');
  }

  return applyEditorUpdates(contents, updates, 'VS Code policy settings', warnings);
}

/**
 * Merge OPA extension recommendations without disturbing unknown entries.
 *
 * VS Code's `extensions.json` schema supports `unwantedRecommendations`, so
 * the syntax-only extension can be removed from recommendations and discouraged.
 *
 * @param contents - Existing `.vscode/extensions.json` JSONC
 * @returns Merged extension recommendations and warnings
 */
export function mergePolicyEditorExtensions(contents: string | null): PolicyEditorMergeResult {
  const parsed = parseEditorObject(contents, 'VS Code policy extension recommendations');
  if ('warning' in parsed) {
    return { contents: parsed.contents, warnings: [parsed.warning] };
  }
  const { current } = parsed;
  const updates: JsoncUpdate[] = [];
  const warnings: string[] = [];

  const recommendations = current.recommendations;
  if (
    recommendations === undefined ||
    (Array.isArray(recommendations) && recommendations.every((value) => typeof value === 'string'))
  ) {
    const existing = recommendations ?? [];
    const desired = mergeStringArray(existing, [POLICY_VSCODE_EXTENSION]).filter(
      (value) => value !== CONFLICTING_POLICY_VSCODE_EXTENSION,
    );
    if (!configurationValuesEqual(existing, desired)) {
      updates.push({ path: ['recommendations'], value: desired });
    }
  } else {
    warnings.push(
      'VS Code extension recommendations use an unknown shape and were left unchanged.',
    );
  }

  const unwanted = current.unwantedRecommendations;
  if (
    unwanted === undefined ||
    (Array.isArray(unwanted) && unwanted.every((value) => typeof value === 'string'))
  ) {
    const existing = unwanted ?? [];
    const desired = mergeStringArray(existing, [CONFLICTING_POLICY_VSCODE_EXTENSION]);
    if (!configurationValuesEqual(existing, desired)) {
      updates.push({ path: ['unwantedRecommendations'], value: desired });
    }
  } else {
    warnings.push(
      'VS Code unwanted extension recommendations use an unknown shape and were left unchanged.',
    );
  }

  return applyEditorUpdates(
    contents,
    updates,
    'VS Code policy extension recommendations',
    warnings,
  );
}

/**
 * Build a VS Code check task for one bundle.
 *
 * @param repositoryRoot - Root that owns `.vscode`
 * @param workspaceDirectory - Selected policy workspace directory
 * @param bundle - Package root and local directory basename
 * @returns VS Code task object
 */
export function buildPolicyCheckTask(
  repositoryRoot: string,
  workspaceDirectory: string,
  bundle: PolicyBundleRef = policyBundleRef(POLICY_STARTER_ROOT),
): Record<string, unknown> {
  const workspace = repositoryRelativePosix(repositoryRoot, workspaceDirectory);
  const path = workspace === '.' ? bundle.bundleDir : `${workspace}/${bundle.bundleDir}`;
  return {
    label: `policy: check ${bundle.root}`,
    type: 'process',
    command: 'transcend',
    args: ['policy', 'check', path, '--noInteractive'],
    group: {
      kind: 'test',
      isDefault: false,
    },
    problemMatcher: [],
  };
}

/**
 * Build the aggregate "policy: check" task (runs all bundles).
 *
 * @param bundles - Local publish units
 * @returns VS Code task object
 */
export function buildPolicyAggregateCheckTask(
  bundles: readonly PolicyBundleRef[],
): Record<string, unknown> {
  return {
    label: 'policy: check',
    dependsOn: bundles.map((bundle) => `policy: check ${bundle.root}`),
    dependsOrder: 'sequence',
    group: {
      kind: 'test',
      isDefault: true,
    },
    problemMatcher: [],
  };
}

/**
 * Whether a VS Code task label is a managed policy verification task.
 *
 * Includes legacy `policy: lint*` labels so re-running editor setup migrates
 * them to `policy: check*`.
 *
 * @param label - Task label
 * @returns True when the task is managed by policy scaffolding
 */
function isManagedPolicyVerificationTaskLabel(label: unknown): boolean {
  return (
    typeof label === 'string' &&
    (label === 'policy: check' ||
      label.startsWith('policy: check ') ||
      label === 'policy: lint' ||
      label.startsWith('policy: lint '))
  );
}

/**
 * Merge policy check tasks while preserving custom tasks.
 *
 * When `bundles` is provided, creates per-bundle tasks and an aggregate.
 * Managed `policy: check*` tasks are updated in place as roots grow. Legacy
 * `policy: lint*` tasks are removed so editor setup migrates to `check`.
 * When omitted, skips task creation (init without bundles).
 *
 * @param contents - Existing `.vscode/tasks.json` JSONC
 * @param repositoryRoot - Root that owns `.vscode`
 * @param workspaceDirectory - Selected policy workspace directory
 * @param bundles - Local publish units to generate tasks for
 * @returns Merged task configuration and warnings
 */
export function mergePolicyEditorTasks(
  contents: string | null,
  repositoryRoot: string,
  workspaceDirectory: string,
  bundles?: readonly PolicyBundleRef[],
): PolicyEditorMergeResult {
  const parsed = parseEditorObject(contents, 'VS Code policy tasks');
  if ('warning' in parsed) {
    return { contents: parsed.contents, warnings: [parsed.warning] };
  }
  const { current } = parsed;
  const updates: JsoncUpdate[] = [];
  const warnings: string[] = [];
  const version = current.version;
  if (version === undefined) {
    updates.push({ path: ['version'], value: '2.0.0' });
  } else if (version !== '2.0.0') {
    warnings.push('VS Code task schema version is customized and was left unchanged.');
  }

  if (!bundles || bundles.length === 0) {
    return applyEditorUpdates(contents, updates, 'VS Code policy tasks', warnings);
  }

  const desiredPerBundleTasks = bundles.map((bundle) =>
    buildPolicyCheckTask(repositoryRoot, workspaceDirectory, bundle),
  );
  const desiredAggregateTask = buildPolicyAggregateCheckTask(bundles);
  const desiredTasks = [...desiredPerBundleTasks, desiredAggregateTask];
  const managedLabels = new Set(desiredTasks.map((task) => task.label as string));
  const tasks = current.tasks;
  if (tasks === undefined) {
    updates.push({ path: ['tasks'], value: desiredTasks });
  } else if (Array.isArray(tasks)) {
    let merged = tasks.filter((task) => {
      if (task === null || typeof task !== 'object' || Array.isArray(task)) {
        return true;
      }
      const label = (task as Record<string, unknown>).label;
      return !isManagedPolicyVerificationTaskLabel(label) || managedLabels.has(label as string);
    });
    let changed = merged.length !== tasks.length;
    desiredTasks.forEach((desired) => {
      const label = desired.label as string;
      const matchingIndex = merged.findIndex(
        (task) =>
          task !== null &&
          typeof task === 'object' &&
          !Array.isArray(task) &&
          (task as Record<string, unknown>).label === label,
      );
      if (matchingIndex === -1) {
        merged = [...merged, desired];
        changed = true;
        return;
      }
      if (!configurationValuesEqual(merged[matchingIndex], desired)) {
        if (managedLabels.has(label)) {
          merged = merged.map((task, index) => (index === matchingIndex ? desired : task));
          changed = true;
        } else {
          warnings.push(
            `VS Code task "${label}" has repository-specific customization and was left unchanged.`,
          );
        }
      }
    });
    if (changed) {
      updates.push({ path: ['tasks'], value: merged });
    }
  } else {
    warnings.push('VS Code tasks use an unknown shape and were left unchanged.');
  }

  return applyEditorUpdates(contents, updates, 'VS Code policy tasks', warnings);
}
