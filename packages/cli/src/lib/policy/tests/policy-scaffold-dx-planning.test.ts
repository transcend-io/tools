import { dirname, join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ExistingProjectSkillDirectory } from '../../scaffolding/agent-skill.js';
import type { PlanningPathSnapshot, ProjectPlan } from '../../scaffolding/project-plan.js';
import { POLICY_CI_WORKFLOW_PATH } from '../policy-scaffold-artifacts.js';
import { PolicySetupFeature, type PolicyProjectState } from '../policy-scaffold-model.js';
import {
  buildPolicyInitPlan,
  getPolicyInitPlanningCandidatePaths,
  type PolicyInitPlanOptions,
} from '../policy-scaffold-planning.js';
import { generatePolicyStarterFiles } from '../policy-scaffold-templates.js';
import { POLICY_SKILL_FILES, POLICY_SKILL_NAME } from '../policy-skill.js';

const CLI_VERSION = '10.27.4';

/**
 * Build deterministic repository discovery state.
 *
 * @param existingSkillDirectories - Existing project skill containers
 * @returns Synthetic policy project state
 */
function buildState(
  existingSkillDirectories: ExistingProjectSkillDirectory[] = [],
): PolicyProjectState {
  return {
    invocationDirectory: '/repo',
    targetDirectory: '/repo/transcend/policy',
    projectRoot: '/repo',
    repositoryRoot: '/repo',
    existingSkillDirectories,
    usesGithub: true,
    relativePaths: [],
  };
}

/**
 * Make absent snapshots for every candidate path.
 *
 * @param paths - Absolute candidate paths
 * @returns Snapshot record
 */
function absentSnapshots(paths: readonly string[]): Record<string, PlanningPathSnapshot> {
  return Object.fromEntries(paths.map((path) => [path, { kind: 'absent', path }]));
}

/**
 * Apply planned file and link outcomes to snapshots.
 *
 * @param paths - Complete candidate paths
 * @param plan - Planned changes
 * @returns Synthetic post-apply snapshots
 */
function snapshotsAfterPlan(
  paths: readonly string[],
  plan: ProjectPlan,
): Record<string, PlanningPathSnapshot> {
  const snapshots = absentSnapshots(paths);
  plan.changes.forEach((change) => {
    snapshots[change.path] =
      change.kind === 'file'
        ? {
            kind: 'file',
            path: change.path,
            contents: change.after,
            mode: 0o100644,
          }
        : {
            kind: 'link',
            path: change.path,
            target: change.target,
          };
  });
  return snapshots;
}

/**
 * Enumerate target-relative paths created by the core starter.
 *
 * @param state - Policy state
 * @returns Relative files and directories
 */
function starterRelativePaths(state: PolicyProjectState): string[] {
  const paths = new Set<string>();
  generatePolicyStarterFiles().forEach((file) => {
    const path = join(state.targetDirectory, file.path);
    paths.add(relative(state.targetDirectory, path).split(sep).join('/'));
    let parent = dirname(path);
    while (parent !== state.targetDirectory) {
      paths.add(relative(state.targetDirectory, parent).split(sep).join('/'));
      parent = dirname(parent);
    }
  });
  return [...paths].sort();
}

describe('Policy Engine repository integration planning', () => {
  it('plans editor setup, the managed skill, and validation CI together', () => {
    const state = buildState();
    const options: PolicyInitPlanOptions = {
      features: [PolicySetupFeature.Editor, PolicySetupFeature.Skill, PolicySetupFeature.Ci],
      cliVersion: CLI_VERSION,
    };
    const paths = getPolicyInitPlanningCandidatePaths(state, options);
    const plan = buildPolicyInitPlan({ state, snapshots: absentSnapshots(paths) }, options);

    expect(paths).toEqual(
      expect.arrayContaining([
        '/repo/.vscode/settings.json',
        '/repo/.vscode/extensions.json',
        '/repo/.vscode/tasks.json',
        `/repo/.agents/skills/${POLICY_SKILL_NAME}/SKILL.md`,
        `/repo/${POLICY_CI_WORKFLOW_PATH}`,
      ]),
    );
    POLICY_SKILL_FILES.forEach(({ path }) => {
      expect(paths).toContain(`/repo/.agents/skills/${POLICY_SKILL_NAME}/${path}`);
    });
    expect(plan.features).toEqual(options.features);
    expect(plan.changes).toHaveLength(16);
    expect(plan.warnings).toEqual([]);
  });

  it('is idempotent after applying the complete default-selected plan', () => {
    const state = buildState();
    const options: PolicyInitPlanOptions = {
      features: Object.values(PolicySetupFeature),
      cliVersion: CLI_VERSION,
    };
    const paths = getPolicyInitPlanningCandidatePaths(state, options);
    const first = buildPolicyInitPlan({ state, snapshots: absentSnapshots(paths) }, options);
    state.relativePaths = starterRelativePaths(state);

    const second = buildPolicyInitPlan(
      { state, snapshots: snapshotsAfterPlan(paths, first) },
      options,
    );

    expect(second.changes).toEqual([]);
    expect(second.warnings).toEqual([]);
    expect(second.unchanged).toHaveLength(16);
  });

  it('uses one existing skill directory without inventing editor-specific copies', () => {
    const state = buildState([{ path: '.claude/skills', supportsAgentsSkills: false }]);
    const options: PolicyInitPlanOptions = {
      features: [PolicySetupFeature.Skill],
      cliVersion: CLI_VERSION,
    };
    const paths = getPolicyInitPlanningCandidatePaths(state, options);
    const plan = buildPolicyInitPlan({ state, snapshots: absentSnapshots(paths) }, options);
    const skillChanges = plan.changes.filter((change) => change.path.includes('/skills/'));

    expect(skillChanges.map(({ path }) => path)).toEqual(
      POLICY_SKILL_FILES.map(({ path }) => `/repo/.claude/skills/${POLICY_SKILL_NAME}/${path}`),
    );
    expect(paths.some((path) => path.includes('/.agents/skills/'))).toBe(false);
    expect(paths.some((path) => path.includes('/.cursor/skills/'))).toBe(false);
    expect(skillChanges.every((change) => change.kind === 'file')).toBe(true);
  });

  it('preserves a customized managed skill and emits an actionable warning', () => {
    const state = buildState();
    const options: PolicyInitPlanOptions = {
      features: [PolicySetupFeature.Skill],
      cliVersion: CLI_VERSION,
    };
    const paths = getPolicyInitPlanningCandidatePaths(state, options);
    const first = buildPolicyInitPlan({ state, snapshots: absentSnapshots(paths) }, options);
    const snapshots = snapshotsAfterPlan(paths, first);
    const skillPath = `/repo/.agents/skills/${POLICY_SKILL_NAME}/SKILL.md`;
    const generatedSkill = snapshots[skillPath];
    if (generatedSkill?.kind !== 'file') {
      throw new Error('Expected the first plan to create the canonical skill.');
    }
    snapshots[skillPath] = {
      ...generatedSkill,
      contents: generatedSkill.contents.replace(
        'Use the CLI for deterministic scaffolding',
        'Use repository-specific policy guidance',
      ),
    };
    state.relativePaths = starterRelativePaths(state);

    const plan = buildPolicyInitPlan({ state, snapshots }, options);

    expect(plan.changes).toEqual([]);
    expect(plan.unchanged).toContain(skillPath);
    expect(plan.warnings).toEqual([
      expect.stringContaining(
        `Customized managed skill file was left unchanged: .agents/skills/${POLICY_SKILL_NAME}/SKILL.md`,
      ),
    ]);
  });

  it('preserves an existing workflow and conflicting editor values', () => {
    const state = buildState();
    const options: PolicyInitPlanOptions = {
      features: [PolicySetupFeature.Editor, PolicySetupFeature.Ci],
      cliVersion: CLI_VERSION,
    };
    const paths = getPolicyInitPlanningCandidatePaths(state, options);
    const snapshots = absentSnapshots(paths);
    const settingsPath = '/repo/.vscode/settings.json';
    snapshots[settingsPath] = {
      kind: 'file',
      path: settingsPath,
      contents: '{"opa.strictMode":false}\n',
      mode: 0o100644,
    };
    const workflowPath = `/repo/${POLICY_CI_WORKFLOW_PATH}`;
    snapshots[workflowPath] = {
      kind: 'file',
      path: workflowPath,
      contents: 'name: Repository policy checks\n',
      mode: 0o100644,
    };

    const plan = buildPolicyInitPlan({ state, snapshots }, options);

    expect(plan.unchanged).toContain(workflowPath);
    expect(plan.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('opa.strictMode'),
        expect.stringContaining('Existing GitHub Actions workflow was left unchanged'),
      ]),
    );
    expect(
      plan.changes.find((change) => change.path === settingsPath && change.kind === 'file'),
    ).toMatchObject({
      before: '{"opa.strictMode":false}\n',
    });
  });
});
