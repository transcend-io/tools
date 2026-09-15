import { dirname, join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { PlanningPathSnapshot } from '../../scaffolding/project-plan.js';
import type { PolicyProjectState } from '../policy-scaffold-model.js';
import {
  buildPolicyInitPlan,
  getPolicyInitPlanningCandidatePaths,
} from '../policy-scaffold-planning.js';
import { generatePolicyWorkspaceFiles } from '../policy-scaffold-templates.js';

/** Stable no-integration planner options. */
const CORE_OPTIONS = { features: [], cliVersion: '10.27.4' } as const;

/**
 * Build deterministic discovery state without filesystem access.
 *
 * @param root - Synthetic project root
 * @param targetDirectory - Optional custom target
 * @returns Policy project state
 */
function buildState(
  root: string,
  targetDirectory: string = join(root, 'transcend', 'policy'),
): PolicyProjectState {
  return {
    invocationDirectory: root,
    targetDirectory,
    projectRoot: root,
    repositoryRoot: root,
    existingSkillDirectories: [],
    usesGithub: true,
    relativePaths: [],
    relativeFilePaths: [],
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
 * Model the exact workspace after applying a fresh plan.
 *
 * @param state - Policy project state
 * @returns Workspace snapshots and relative paths
 */
function initializedState(state: PolicyProjectState): {
  /** State containing exact workspace paths. */
  state: PolicyProjectState;
  /** File snapshots containing exact generated contents. */
  snapshots: Record<string, PlanningPathSnapshot>;
} {
  const snapshots = absentSnapshots(getPolicyInitPlanningCandidatePaths(state, CORE_OPTIONS));
  const relativePaths = new Set<string>();
  const relativeFilePaths: string[] = [];
  generatePolicyWorkspaceFiles().forEach((file) => {
    const path = join(state.targetDirectory, file.path);
    snapshots[path] = {
      kind: 'file',
      path,
      contents: file.contents,
      mode: 0o100644,
    };
    const relativePath = relative(state.targetDirectory, path).split(sep).join('/');
    relativePaths.add(relativePath);
    relativeFilePaths.push(relativePath);
    let parent = dirname(path);
    while (parent !== state.targetDirectory) {
      relativePaths.add(relative(state.targetDirectory, parent).split(sep).join('/'));
      parent = dirname(parent);
    }
  });
  return {
    state: {
      ...state,
      relativePaths: [...relativePaths].sort(),
      relativeFilePaths: relativeFilePaths.sort(),
    },
    snapshots,
  };
}

describe('buildPolicyInitPlan', () => {
  it('creates workspace files in one deterministic create-only plan', () => {
    const state = buildState('/repo');
    const paths = getPolicyInitPlanningCandidatePaths(state, CORE_OPTIONS);
    const input = { state, snapshots: absentSnapshots(paths) };
    const before = structuredClone(input);

    const first = buildPolicyInitPlan(input, CORE_OPTIONS);
    const second = buildPolicyInitPlan(input, CORE_OPTIONS);

    expect(second).toEqual(first);
    expect(input).toEqual(before);
    expect(first.rootDirectory).toBe('/repo');
    expect(first.directoryPreconditions).toEqual([
      { path: '/repo/transcend/policy', relativePaths: [] },
    ]);
    expect(first.changes).toHaveLength(2);
    expect(
      first.changes.every(
        (change) => change.kind === 'file' && change.before === null && change.createOnly,
      ),
    ).toBe(true);
    expect(first.nextSteps[0]).toBe('transcend policy new');
    expect(first.disposableExamplePath).toBeUndefined();
  });

  it('initializes a target containing only empty directories', () => {
    const state = {
      ...buildState('/repo'),
      relativePaths: ['.regal'],
    };
    const paths = getPolicyInitPlanningCandidatePaths(state, CORE_OPTIONS);

    const plan = buildPolicyInitPlan({ state, snapshots: absentSnapshots(paths) }, CORE_OPTIONS);

    expect(plan.changes).toHaveLength(2);
    expect(plan.directoryPreconditions).toEqual([
      {
        path: '/repo/transcend/policy',
        relativePaths: state.relativePaths,
      },
    ]);
  });

  it('is a clean no-op when rerun against its exact workspace files', () => {
    const initial = initializedState(buildState('/repo'));

    const plan = buildPolicyInitPlan(initial, CORE_OPTIONS);

    expect(plan.changes).toEqual([]);
    expect(plan.warnings).toEqual([]);
    expect(plan.unchanged).toHaveLength(2);
  });

  it('never fills in or overwrites a target containing custom or partial content', () => {
    const state = {
      ...buildState('/repo'),
      relativePaths: ['README.md', 'custom.rego'],
      relativeFilePaths: ['README.md', 'custom.rego'],
    };
    const paths = getPolicyInitPlanningCandidatePaths(state, CORE_OPTIONS);
    const snapshots = absentSnapshots(paths);
    const readmePath = join(state.targetDirectory, 'README.md');
    snapshots[readmePath] = {
      kind: 'file',
      path: readmePath,
      contents: '# Existing policy documentation\n',
      mode: 0o100644,
    };

    const plan = buildPolicyInitPlan({ state, snapshots }, CORE_OPTIONS);

    expect(plan.changes).toEqual([]);
    expect(plan.unchanged).toContain(readmePath);
    expect(plan.warnings).toContain(
      'Existing policy scaffold path was left unchanged: transcend/policy/README.md',
    );
    expect(plan.warnings.at(-1)).toContain('no workspace files were added or overwritten');
    expect(plan.warnings.at(-1)).toContain('transcend policy new');
    expect(plan.nextSteps).toEqual(['transcend policy new']);
    expect(plan.disposableExamplePath).toBeUndefined();
  });

  it('uses transcend policy new as the next step', () => {
    const state = buildState('/repo', join('/repo', 'policies with spaces'));
    const paths = getPolicyInitPlanningCandidatePaths(state, CORE_OPTIONS);

    const plan = buildPolicyInitPlan({ state, snapshots: absentSnapshots(paths) }, CORE_OPTIONS);

    expect(plan.nextSteps[0]).toBe('transcend policy new');
  });

  it('rejects destinations outside the approved project root', () => {
    const state = {
      ...buildState('/repo', '/outside/policy'),
      projectRoot: '/repo',
    };
    const paths = getPolicyInitPlanningCandidatePaths(state, CORE_OPTIONS);

    expect(() =>
      buildPolicyInitPlan({ state, snapshots: absentSnapshots(paths) }, CORE_OPTIONS),
    ).toThrow('Refusing to modify path outside project root');
  });
});
