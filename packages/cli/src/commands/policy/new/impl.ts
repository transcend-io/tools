import { join, relative, sep } from 'node:path';

import colors from 'colors';

import { version as CLI_VERSION } from '../../../constants.js';
import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import {
  DEFAULT_POLICY_PROJECT_DIRECTORY,
  discoverPolicyProject,
} from '../../../lib/policy/policy-project-discovery.js';
import {
  generatePolicyGithubActionsWorkflow,
  POLICY_CI_WORKFLOW_PATH,
} from '../../../lib/policy/policy-scaffold-artifacts.js';
import {
  mergePolicyEditorSettings,
  mergePolicyEditorTasks,
  policyBundleRef,
  type PolicyBundleRef,
} from '../../../lib/policy/policy-scaffold-config.js';
import {
  buildBundleDirectoryName,
  generatePolicyBundleFiles,
  mergePolicyRegalConfigRoots,
  POLICY_MANIFEST_FILENAME,
  POLICY_TEMPLATE_DEFAULT_ROOTS,
  POLICY_TEMPLATE_NAMES,
  POLICY_TEMPLATE_PROMPT_LABELS,
  validateBundleDirectoryName,
  type PolicyTemplateName,
} from '../../../lib/policy/policy-scaffold-templates.js';
import { collectPlanningSnapshots } from '../../../lib/scaffolding/project-discovery.js';
import { applyProjectPlan } from '../../../lib/scaffolding/project-plan-apply.js';
import {
  displayProjectPath,
  quoteShellArgument,
  renderProjectPlan,
} from '../../../lib/scaffolding/project-plan-output.js';
import {
  planFileChange,
  getPlanningFileSnapshot,
  getPlanningPathSnapshot,
  type PlannedChange,
  type ProjectPlan,
} from '../../../lib/scaffolding/project-plan.js';
import {
  isInteractivePromptInvocation,
  PromptCancelledError,
  ScaffoldPrompts,
} from '../../../lib/scaffolding/prompts.js';

/** Flags for `transcend policy new`. */
export interface PolicyNewFlags {
  /** Package root name. */
  name?: string;
  /** Local publish directory basename under the workspace. */
  'bundle-dir'?: string;
  /** Starter template. */
  template?: PolicyTemplateName;
  /** Disable prompts. */
  noInteractive: boolean;
  /** Render but do not apply. */
  dryRun: boolean;
  /** Approve the final displayed plan. */
  yes: boolean;
  /** Emit one stable JSON result on stdout. */
  json: boolean;
}

/** Validate a bundle root name. */
const VALID_ROOT_PATTERN = /^[a-z][a-z0-9_]*$/u;

/**
 * Validate a policy bundle root name.
 *
 * @param value - Proposed root name
 * @returns True or error message
 */
function validateRootName(value: string): true | string {
  if (!value) {
    return 'Enter a bundle root name.';
  }
  if (!VALID_ROOT_PATTERN.test(value)) {
    return 'Root name must be lowercase alphanumeric with underscores (e.g. "example", "permissions").';
  }
  if (value.length > 64) {
    return 'Root name cannot exceed 64 characters.';
  }
  return true;
}

/**
 * Scaffold one policy bundle from a template.
 *
 * @param this - CLI context
 * @param flags - Template and interaction flags
 * @param directory - Target policy workspace directory
 */
export async function _new(
  this: LocalContext,
  flags: PolicyNewFlags,
  directory: string = DEFAULT_POLICY_PROJECT_DIRECTORY,
): Promise<void> {
  doneInputValidation(this.process);
  try {
    const state = discoverPolicyProject(this, directory);
    const regalConfigPath = join(state.targetDirectory, '.regal', 'config.yaml');

    if (!this.fs.existsSync(regalConfigPath)) {
      throw new Error(
        `No policy workspace found at ${displayProjectPath(
          state.invocationDirectory,
          state.targetDirectory,
        )}. Run \`transcend policy init\` first.`,
      );
    }

    const prompts = new ScaffoldPrompts(this);
    const interactive = isInteractivePromptInvocation(
      flags,
      this.process.stdin.isTTY,
      this.process.stderr.isTTY,
    );

    const template =
      flags.template ??
      (interactive
        ? await prompts.select<PolicyTemplateName>(
            'Template:',
            POLICY_TEMPLATE_NAMES.map((value) => ({
              name: POLICY_TEMPLATE_PROMPT_LABELS[value],
              value,
            })),
            POLICY_TEMPLATE_NAMES[0],
          )
        : undefined);
    if (!template || !POLICY_TEMPLATE_NAMES.includes(template)) {
      throw new Error(
        `Missing policy template. Pass --template=${POLICY_TEMPLATE_NAMES.join(' or --template=')}.`,
      );
    }

    const defaultRoot = POLICY_TEMPLATE_DEFAULT_ROOTS[template];
    const name =
      flags.name ??
      (interactive
        ? await prompts.text('Bundle root name:', defaultRoot, (value) => {
            const result = validateRootName(value);
            return result === true ? true : result;
          })
        : undefined);
    if (!name) {
      throw new Error('Missing bundle root name. Pass --name in a non-interactive invocation.');
    }
    const rootValidation = validateRootName(name);
    if (rootValidation !== true) {
      throw new Error(rootValidation);
    }

    const defaultBundleDir = buildBundleDirectoryName(name);
    const bundleDir =
      flags['bundle-dir'] ??
      (interactive
        ? await prompts.text('Bundle directory name:', defaultBundleDir, (value) => {
            const result = validateBundleDirectoryName(value);
            return result === true ? true : result;
          })
        : defaultBundleDir);
    const bundleDirValidation = validateBundleDirectoryName(bundleDir);
    if (bundleDirValidation !== true) {
      throw new Error(bundleDirValidation);
    }

    const bundlePath = join(state.targetDirectory, bundleDir);
    if (this.fs.existsSync(bundlePath)) {
      throw new Error(
        `Bundle directory already exists: ${displayProjectPath(
          state.invocationDirectory,
          bundlePath,
        )}. Choose a different --bundle-dir.`,
      );
    }

    const files = generatePolicyBundleFiles(template, name, bundleDir);
    const existingRegalContents = this.fs.readFileSync(regalConfigPath, 'utf8');
    const { contents: updatedRegalConfig, roots: allRoots } = mergePolicyRegalConfigRoots(
      existingRegalContents,
      name,
    );
    const bundleRefs: PolicyBundleRef[] = allRoots.map((root) =>
      root === name ? { root, bundleDir, template } : policyBundleRef(root),
    );

    const candidatePaths = [
      regalConfigPath,
      ...files.map(({ path }) => join(state.targetDirectory, path)),
    ];

    const vscodeSettingsPath = join(state.projectRoot, '.vscode', 'settings.json');
    const vscodeTasksPath = join(state.projectRoot, '.vscode', 'tasks.json');
    const hasVscode = this.fs.existsSync(join(state.projectRoot, '.vscode'));
    if (hasVscode) {
      candidatePaths.push(vscodeSettingsPath, vscodeTasksPath);
    }

    const workflowPath =
      state.repositoryRoot && state.usesGithub
        ? join(state.repositoryRoot, POLICY_CI_WORKFLOW_PATH)
        : undefined;
    if (workflowPath && this.fs.existsSync(workflowPath)) {
      candidatePaths.push(workflowPath);
    }

    const snapshots = collectPlanningSnapshots(
      this,
      state.projectRoot,
      candidatePaths.sort((a, b) => a.localeCompare(b)),
    );

    const changes: PlannedChange[] = [];
    const warnings: string[] = [];
    const unchanged: string[] = [];

    const regalChange = planFileChange({
      snapshot: getPlanningFileSnapshot(snapshots, regalConfigPath),
      after: updatedRegalConfig,
      description: `Merge ${name} root into Regal config`,
    });
    if (regalChange) {
      changes.push(regalChange);
    } else {
      unchanged.push(regalConfigPath);
    }

    files.forEach((file) => {
      const path = join(state.targetDirectory, file.path);
      const snapshot = getPlanningPathSnapshot(snapshots, path);
      if (snapshot.kind !== 'absent') {
        throw new Error(`Expected an empty path but found an entry at: ${path}`);
      }
      const change = planFileChange({
        snapshot: getPlanningFileSnapshot(snapshots, path),
        after: file.contents,
        description: file.description,
      });
      if (change) {
        changes.push(change);
      } else {
        unchanged.push(path);
      }
    });

    if (hasVscode) {
      const settingsSnapshot = getPlanningPathSnapshot(snapshots, vscodeSettingsPath);
      if (settingsSnapshot.kind === 'file' || settingsSnapshot.kind === 'absent') {
        const settingsResult = mergePolicyEditorSettings(
          settingsSnapshot.kind === 'file' ? settingsSnapshot.contents : null,
          state.projectRoot,
          state.targetDirectory,
          bundleRefs,
        );
        const settingsChange = planFileChange({
          snapshot:
            settingsSnapshot.kind === 'file'
              ? {
                  path: vscodeSettingsPath,
                  contents: settingsSnapshot.contents,
                  mode: settingsSnapshot.mode,
                }
              : { path: vscodeSettingsPath, contents: null },
          after: settingsResult.contents,
          description: 'Merge bundle root into VS Code OPA settings',
        });
        if (settingsChange) {
          changes.push(settingsChange);
        } else {
          unchanged.push(vscodeSettingsPath);
        }
        warnings.push(
          ...settingsResult.warnings.map(
            (w) => `${w} (${displayProjectPath(state.invocationDirectory, vscodeSettingsPath)})`,
          ),
        );
      }

      const tasksSnapshot = getPlanningPathSnapshot(snapshots, vscodeTasksPath);
      if (tasksSnapshot.kind === 'file' || tasksSnapshot.kind === 'absent') {
        const tasksResult = mergePolicyEditorTasks(
          tasksSnapshot.kind === 'file' ? tasksSnapshot.contents : null,
          state.projectRoot,
          state.targetDirectory,
          bundleRefs,
        );
        const tasksChange = planFileChange({
          snapshot:
            tasksSnapshot.kind === 'file'
              ? {
                  path: vscodeTasksPath,
                  contents: tasksSnapshot.contents,
                  mode: tasksSnapshot.mode,
                }
              : { path: vscodeTasksPath, contents: null },
          after: tasksResult.contents,
          description: 'Add per-bundle and aggregate lint tasks',
        });
        if (tasksChange) {
          changes.push(tasksChange);
        } else {
          unchanged.push(vscodeTasksPath);
        }
        warnings.push(
          ...tasksResult.warnings.map(
            (w) => `${w} (${displayProjectPath(state.invocationDirectory, vscodeTasksPath)})`,
          ),
        );
      }
    }

    if (workflowPath && state.repositoryRoot) {
      const workflowSnapshot = getPlanningPathSnapshot(snapshots, workflowPath);
      if (workflowSnapshot.kind === 'file') {
        const workspaceDirectory =
          relative(state.repositoryRoot, state.targetDirectory).split(sep).join('/') || '.';
        const bundleDirectories = bundleRefs.map((bundle) => {
          return workspaceDirectory === '.'
            ? bundle.bundleDir
            : `${workspaceDirectory}/${bundle.bundleDir}`;
        });
        const desiredWorkflow = generatePolicyGithubActionsWorkflow({
          cliVersion: CLI_VERSION,
          workspaceDirectory,
          bundleDirectories,
        });
        if (workflowSnapshot.contents.startsWith('# Generated by transcend policy init')) {
          const workflowChange = planFileChange({
            snapshot: {
              path: workflowPath,
              contents: workflowSnapshot.contents,
              mode: workflowSnapshot.mode,
            },
            after: desiredWorkflow,
            description: 'Update Policy Engine CI matrix for all publish directories',
          });
          if (workflowChange) {
            changes.push(workflowChange);
          } else {
            unchanged.push(workflowPath);
          }
        } else {
          warnings.push(
            `Existing GitHub Actions workflow was left unchanged: ${displayProjectPath(
              state.invocationDirectory,
              workflowPath,
            )}. Adapt it manually to lint each \`*-bundle/\` publish directory.`,
          );
          unchanged.push(workflowPath);
        }
      }
    }

    const lintCommand = `transcend policy lint ${quoteShellArgument(
      displayProjectPath(state.invocationDirectory, bundlePath),
    )} --noInteractive`;

    const plan: ProjectPlan & {
      /** Absolute workspace directory. */
      targetDirectory: string;
      /** Absolute manifest path. */
      manifestPath: string;
      /** Unchanged paths. */
      unchanged: string[];
      /** Non-fatal warnings. */
      warnings: string[];
      /** Follow-up commands. */
      nextSteps: string[];
    } = {
      rootDirectory: state.projectRoot,
      targetDirectory: state.targetDirectory,
      manifestPath: join(bundlePath, POLICY_MANIFEST_FILENAME),
      changes,
      unchanged,
      warnings,
      nextSteps: [lintCommand],
    };

    if (!flags.json) {
      this.logger.info(
        renderProjectPlan(plan, {
          cwd: this.process.cwd(),
          title: 'Policy bundle plan',
          details: [
            { label: 'Workspace', path: plan.targetDirectory },
            { label: 'Bundle', path: bundlePath },
          ],
        }),
      );
    }

    let approved = plan.changes.length === 0 || flags.dryRun;
    if (plan.changes.length > 0 && !flags.dryRun) {
      if (flags.yes) {
        approved = true;
      } else if (interactive) {
        approved = await prompts.confirm('Apply this complete plan?', true);
      } else {
        throw new Error(
          'The plan requires approval in a non-interactive invocation. Review with --dryRun, then pass --yes.',
        );
      }
    }

    if (approved && !flags.dryRun && plan.changes.length > 0) {
      await applyProjectPlan(this, plan);
    }
    const applied = approved && !flags.dryRun && plan.changes.length > 0;

    if (flags.json) {
      this.process.stdout.write(
        `${JSON.stringify({
          applied,
          dryRun: flags.dryRun,
          template,
          root: name,
          bundleDirectory: bundlePath,
          targetDirectory: plan.targetDirectory,
          manifestPath: plan.manifestPath,
          changes: plan.changes.map((change) => ({
            kind: change.kind,
            target: displayProjectPath(this.process.cwd(), change.path),
            description: change.description,
          })),
          warnings: plan.warnings,
          nextSteps: plan.nextSteps,
        })}\n`,
      );
      return;
    }
    if (flags.dryRun) {
      this.logger.info(colors.yellow('Dry run complete. No changes were written.'));
      return;
    }
    if (!approved) {
      this.logger.info(colors.yellow('No changes applied.'));
      return;
    }
    this.logger.info(colors.green(`Policy bundle ${name} added.`));
    if (plan.nextSteps.length > 0) {
      this.logger.info(`\n${colors.bold('Next steps')}`);
      plan.nextSteps.forEach((step) => this.logger.info(step));
    }
  } catch (error) {
    if (error instanceof PromptCancelledError) {
      this.process.exit(130);
    }
    throw error;
  }
}
