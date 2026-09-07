import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { AGENT_SKILL_TARGETS } from '../config.js';
import type { CustomFunctionProjectState } from '../discovery.js';
import { CustomFunctionSetupFeature } from '../model.js';
import {
  buildInitPlan,
  buildNewPlan,
  getPlanningCandidatePaths,
  prepareGeneratedCustomFunction,
  type CustomFunctionPlanningInput,
  type PlanningPathSnapshot,
} from '../planning.js';

/**
 * Build deterministic discovery state without filesystem access.
 *
 * @param root - Synthetic repository root
 * @returns Project discovery state
 */
function buildState(root: string): CustomFunctionProjectState {
  const targetDirectory = join(root, 'custom-functions');
  return {
    targetDirectory,
    manifestDirectory: targetDirectory,
    manifestPath: join(targetDirectory, 'transcend-functions.yml'),
    repositoryRoot: root,
    denoConfigPath: join(targetDirectory, 'deno.json'),
    detectedAgents: [],
    usesGithub: true,
    relativePaths: [],
  };
}

/**
 * Make absent snapshots for every planning candidate.
 *
 * @param paths - Candidate absolute paths
 * @returns Snapshot record
 */
function absentSnapshots(paths: readonly string[]): Record<string, PlanningPathSnapshot> {
  return Object.fromEntries(paths.map((path) => [path, { kind: 'absent', path }]));
}

/**
 * Build a planner input with fixed package versions.
 *
 * @param state - Discovery state
 * @param snapshots - Candidate path snapshots
 * @returns Planner input
 */
function buildInput(
  state: CustomFunctionProjectState,
  snapshots: Readonly<Record<string, PlanningPathSnapshot>>,
): CustomFunctionPlanningInput {
  return {
    state,
    snapshots,
    contractVersion: '1.2.3',
    cliVersion: '10.27.4',
  };
}

/**
 * Model the snapshots produced after applying a file/link-only plan.
 *
 * @param paths - Candidate absolute paths
 * @param plan - Plan to model as applied
 * @returns Applied snapshot record
 */
function snapshotsAfterPlan(
  paths: readonly string[],
  plan: ReturnType<typeof buildInitPlan>,
): Record<string, PlanningPathSnapshot> {
  const snapshots = absentSnapshots(paths);
  plan.changes.forEach((change) => {
    if (change.kind === 'file') {
      snapshots[change.path] = {
        kind: 'file',
        path: change.path,
        contents: change.after,
        mode: change.mode ?? 0o100644,
      };
    } else if (change.kind === 'link') {
      snapshots[change.path] = {
        kind: 'link',
        path: change.path,
        target: change.target,
      };
    }
  });
  return snapshots;
}

describe('buildInitPlan', () => {
  it('builds deterministic plans from immutable snapshots', () => {
    const state = buildState('/repo');
    const features = [CustomFunctionSetupFeature.Deno, CustomFunctionSetupFeature.Ci];
    const paths = getPlanningCandidatePaths(state, { features });
    const input = buildInput(state, absentSnapshots(paths));
    const before = structuredClone(input);

    expect(buildInitPlan(input, { features })).toEqual(buildInitPlan(input, { features }));
    expect(input).toEqual(before);
  });

  it('produces a no-op plan when rerun against its own desired files', () => {
    const state = buildState('/repo');
    const features = [CustomFunctionSetupFeature.Deno, CustomFunctionSetupFeature.Ci];
    const paths = getPlanningCandidatePaths(state, { features });
    const first = buildInitPlan(buildInput(state, absentSnapshots(paths)), { features });
    const rerun = buildInitPlan(buildInput(state, snapshotsAfterPlan(paths, first)), { features });

    expect(rerun.changes).toEqual([]);
    expect(rerun.unchanged).toEqual(
      expect.arrayContaining([
        state.manifestPath,
        state.denoConfigPath,
        join('/repo', '.github', 'workflows', 'transcend-custom-functions.yml'),
      ]),
    );
  });
});

describe('buildNewPlan', () => {
  it('builds a deterministic manifest, source, and payload plan', () => {
    const state = buildState('/repo');
    const generated = prepareGeneratedCustomFunction('Score Lead', 'general');
    const features: readonly [] = [];
    const paths = getPlanningCandidatePaths(state, { features, generated });
    const input = buildInput(state, absentSnapshots(paths));

    const first = buildNewPlan(input, { features, generated });
    const second = buildNewPlan(input, { features, generated });

    expect(second).toEqual(first);
    expect(
      first.changes.filter((change) => change.kind === 'file').map(({ path }) => path),
    ).toEqual([
      state.manifestPath,
      join(state.manifestDirectory, generated.sourceFile.path),
      join(state.manifestDirectory, generated.payloadFiles[0]!.path),
    ]);
  });

  it.each(['source', 'payload'] as const)(
    'refuses to overwrite an existing %s file even when generated contents match',
    (kind) => {
      const state = buildState('/repo');
      const generated = prepareGeneratedCustomFunction('Score Lead', 'general');
      const features: readonly [] = [];
      const paths = getPlanningCandidatePaths(state, { features, generated });
      const snapshots = absentSnapshots(paths);
      const file = kind === 'source' ? generated.sourceFile : generated.payloadFiles[0]!;
      const destination = join(state.manifestDirectory, file.path);
      snapshots[destination] = {
        kind: 'file',
        path: destination,
        contents: file.contents,
        mode: 0o100644,
      };

      expect(() => buildNewPlan(buildInput(state, snapshots), { features, generated })).toThrow(
        `Refusing to overwrite existing file: ${destination}`,
      );
    },
  );

  it('rejects case-insensitive collisions with existing repository paths', () => {
    const state = {
      ...buildState('/repo'),
      relativePaths: ['Functions/score-lead.ts'],
    };
    const generated = prepareGeneratedCustomFunction('Score Lead', 'general');
    const features: readonly [] = [];
    const paths = getPlanningCandidatePaths(state, { features, generated });

    expect(() =>
      buildNewPlan(buildInput(state, absentSnapshots(paths)), {
        features,
        generated,
      }),
    ).toThrow(
      'Case-insensitive path collision: "functions/score-lead.ts" conflicts with "Functions/score-lead.ts".',
    );
  });
});

describe('agent skill planning', () => {
  it('deduplicates shared target directories and recognizes an existing link', () => {
    const state = buildState('/repo');
    state.detectedAgents = ['universal', 'cline', 'claude-code'].map(
      (id) => AGENT_SKILL_TARGETS.find((target) => target.id === id)!,
    );
    const features = [CustomFunctionSetupFeature.Skill];
    const paths = getPlanningCandidatePaths(state, { features });
    const first = buildInitPlan(buildInput(state, absentSnapshots(paths)), { features });
    const links = first.changes.filter((change) => change.kind === 'link');

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      path: join('/repo', '.claude', 'skills', 'transcend-custom-functions'),
      target: '../../.agents/skills/transcend-custom-functions',
    });

    const rerun = buildInitPlan(buildInput(state, snapshotsAfterPlan(paths, first)), { features });
    expect(rerun.changes).toEqual([]);
    expect(rerun.unchanged).toContain(links[0]!.path);
  });

  it('refuses a user-modified managed skill instead of overwriting it', () => {
    const state = buildState('/repo');
    state.detectedAgents = [];
    const features = [CustomFunctionSetupFeature.Skill];
    const paths = getPlanningCandidatePaths(state, { features });
    const first = buildInitPlan(buildInput(state, absentSnapshots(paths)), { features });
    const snapshots = snapshotsAfterPlan(paths, first);
    const skillPath = join('/repo', '.agents', 'skills', 'transcend-custom-functions', 'SKILL.md');
    const skill = snapshots[skillPath]!;
    if (skill.kind !== 'file') {
      throw new Error('Expected the first plan to create the canonical skill.');
    }
    snapshots[skillPath] = {
      ...skill,
      contents: skill.contents.replace('Build, validate', 'Customize, validate'),
    };

    expect(() => buildInitPlan(buildInput(state, snapshots), { features })).toThrow(
      `Refusing to replace user-managed skill: ${skillPath}`,
    );
  });
});
