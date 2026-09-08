import { relative, sep } from 'node:path';

import {
  mergeJsonc,
  mergeStringArray,
  parseJsoncObject,
  type JsoncUpdate,
} from '../scaffolding/jsonc.js';

/** Recommended VS Code extension for OPA and Regal authoring. */
export const POLICY_VSCODE_EXTENSION = 'tsandall.opa';

/** Conflicting syntax-only VS Code extension. */
export const CONFLICTING_POLICY_VSCODE_EXTENSION = 'glebbash.opa-highlight-only';

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
 * Build the workspace-relative OPA bundle root.
 *
 * @param repositoryRoot - Root that owns `.vscode`
 * @param targetDirectory - Selected policy project directory
 * @returns VS Code workspace path
 */
function buildOpaWorkspaceRoot(repositoryRoot: string, targetDirectory: string): string {
  const target = relative(repositoryRoot, targetDirectory).split(sep).join('/') || '.';
  return target === '.' ? '${workspaceFolder}' : `\${workspaceFolder}/${target}`;
}

/**
 * Merge strict target-scoped OPA and Rego editor settings.
 *
 * Setting names match the authoritative `open-policy-agent/vscode-opa`
 * extension metadata. Existing conflicting values are preserved and reported.
 *
 * @param contents - Existing `.vscode/settings.json` JSONC
 * @param repositoryRoot - Root that owns `.vscode`
 * @param targetDirectory - Selected policy project directory
 * @returns Merged settings and conflict warnings
 */
export function mergePolicyEditorSettings(
  contents: string | null,
  repositoryRoot: string,
  targetDirectory: string,
): PolicyEditorMergeResult {
  const parsed = parseEditorObject(contents, 'VS Code policy settings');
  if ('warning' in parsed) {
    return { contents: parsed.contents, warnings: [parsed.warning] };
  }
  const { current } = parsed;
  const updates: JsoncUpdate[] = [];
  const warnings: string[] = [];

  const roots = current['opa.roots'];
  const desiredRoot = buildOpaWorkspaceRoot(repositoryRoot, targetDirectory);
  if (roots === undefined) {
    updates.push({ path: ['opa.roots'], value: [desiredRoot] });
  } else if (Array.isArray(roots) && roots.every((value) => typeof value === 'string')) {
    const merged = mergeStringArray(roots, [desiredRoot]);
    if (!configurationValuesEqual(merged, roots)) {
      updates.push({ path: ['opa.roots'], value: merged });
    }
  } else {
    warnings.push('VS Code setting "opa.roots" is customized and was left unchanged.');
  }

  const languageServers = current['opa.languageServers'];
  if (languageServers === undefined) {
    updates.push({ path: ['opa.languageServers'], value: ['regal'] });
  } else if (
    Array.isArray(languageServers) &&
    languageServers.every((value) => typeof value === 'string')
  ) {
    const merged = mergeStringArray(languageServers, ['regal']);
    if (!configurationValuesEqual(merged, languageServers)) {
      updates.push({ path: ['opa.languageServers'], value: merged });
    }
  } else {
    warnings.push('VS Code setting "opa.languageServers" is customized and was left unchanged.');
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
 * Build the generated target-scoped VS Code lint task.
 *
 * @param repositoryRoot - Root that owns `.vscode`
 * @param targetDirectory - Selected policy project directory
 * @returns VS Code task object
 */
export function buildPolicyLintTask(
  repositoryRoot: string,
  targetDirectory: string,
): Record<string, unknown> {
  const target = relative(repositoryRoot, targetDirectory).split(sep).join('/') || '.';
  return {
    label: 'policy: lint',
    type: 'process',
    command: 'transcend',
    args: ['policy', 'lint', '--dir', target, '--noInteractive'],
    group: {
      kind: 'test',
      isDefault: true,
    },
    problemMatcher: [],
  };
}

/**
 * Merge the default policy lint task while preserving custom tasks.
 *
 * @param contents - Existing `.vscode/tasks.json` JSONC
 * @param repositoryRoot - Root that owns `.vscode`
 * @param targetDirectory - Selected policy project directory
 * @returns Merged task configuration and warnings
 */
export function mergePolicyEditorTasks(
  contents: string | null,
  repositoryRoot: string,
  targetDirectory: string,
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

  const desiredTask = buildPolicyLintTask(repositoryRoot, targetDirectory);
  const tasks = current.tasks;
  if (tasks === undefined) {
    updates.push({ path: ['tasks'], value: [desiredTask] });
  } else if (Array.isArray(tasks)) {
    const matchingTask = tasks.find(
      (task) =>
        task !== null &&
        typeof task === 'object' &&
        !Array.isArray(task) &&
        (task as Record<string, unknown>).label === 'policy: lint',
    );
    if (matchingTask === undefined) {
      updates.push({ path: ['tasks'], value: [...tasks, desiredTask] });
    } else if (!configurationValuesEqual(matchingTask, desiredTask)) {
      warnings.push(
        'VS Code task "policy: lint" has repository-specific customization and was left unchanged.',
      );
    }
  } else {
    warnings.push('VS Code tasks use an unknown shape and were left unchanged.');
  }

  return applyEditorUpdates(contents, updates, 'VS Code policy tasks', warnings);
}
