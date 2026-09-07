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
    pnpmWorkspaceRoot: false,
    detectedAgents: [],
    existingSkillDirectories: [],
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

  it.each([
    ['npm', 'npm', ['i', '--save-dev', '@transcend-io/custom-function-types@1.2.3']],
    ['pnpm', 'pnpm', ['add', '--save-dev', '@transcend-io/custom-function-types@1.2.3']],
    ['yarn', 'yarn', ['add', '--save-dev', '@transcend-io/custom-function-types@1.2.3']],
    ['bun', 'bun', ['add', '--save-dev', '@transcend-io/custom-function-types@1.2.3']],
  ] as const)('uses the detected %s command without PATH inference', (agent, command, args) => {
    const state = buildState('/repo');
    state.packageJsonPath = join('/repo', 'package.json');
    state.packageManager = { name: agent, agent };
    const features = [CustomFunctionSetupFeature.PackageManager];
    const paths = getPlanningCandidatePaths(state, { features });
    const snapshots = absentSnapshots(paths);
    snapshots[state.packageJsonPath] = {
      kind: 'file',
      path: state.packageJsonPath,
      contents: '{"name":"example"}\n',
      mode: 0o100644,
    };
    const plan = buildInitPlan(buildInput(state, snapshots), { features });

    expect(plan.changes).toContainEqual(
      expect.objectContaining({
        kind: 'command',
        command,
        args,
        cwd: '/repo',
      }),
    );
  });

  it('makes a pnpm workspace-root install explicit', () => {
    const state = buildState('/repo');
    state.packageJsonPath = join('/repo', 'package.json');
    state.packageManager = { name: 'pnpm', agent: 'pnpm' };
    state.pnpmWorkspaceRoot = true;
    const features = [CustomFunctionSetupFeature.PackageManager];
    const paths = getPlanningCandidatePaths(state, { features });
    const snapshots = absentSnapshots(paths);
    snapshots[state.packageJsonPath] = {
      kind: 'file',
      path: state.packageJsonPath,
      contents: '{"name":"example","private":true}\n',
      mode: 0o100644,
    };

    const plan = buildInitPlan(buildInput(state, snapshots), { features });

    expect(plan.changes).toContainEqual(
      expect.objectContaining({
        kind: 'command',
        command: 'pnpm',
        args: [
          'add',
          '--workspace-root',
          '--save-dev',
          '@transcend-io/custom-function-types@1.2.3',
        ],
        cwd: '/repo',
      }),
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

  it('gives self-contained secret guidance when no skill is installed', () => {
    const state = buildState('/repo');
    const generated = prepareGeneratedCustomFunction('DSR Lookup', 'dsr-datapoint');
    const features: readonly [] = [];
    const paths = getPlanningCandidatePaths(state, { features, generated });
    const plan = buildNewPlan(buildInput(state, absentSnapshots(paths)), {
      features,
      generated,
    });

    expect(plan.warnings).toContain(
      'Supply transcendApiKey through --variables when pushing; never commit the API key.',
    );
  });

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
  it('does not create a skill directory when none exists', () => {
    const state = buildState('/repo');
    const features = [CustomFunctionSetupFeature.Skill];
    const paths = getPlanningCandidatePaths(state, { features });
    const plan = buildInitPlan(buildInput(state, absentSnapshots(paths)), { features });

    expect(paths.some((path) => path.includes('/skills/'))).toBe(false);
    expect(plan.changes.some((change) => change.kind === 'link')).toBe(false);
    expect(
      plan.changes.some((change) => change.kind === 'file' && change.path.endsWith('/SKILL.md')),
    ).toBe(false);
    expect(plan.warnings).toContain(
      'Skipped the coding-agent skill because this repository has no existing skill directory.',
    );
  });

  it('deduplicates shared target directories and recognizes an existing link', () => {
    const state = buildState('/repo');
    state.detectedAgents = ['universal', 'cline', 'claude-code'].map(
      (id) => AGENT_SKILL_TARGETS.find((target) => target.id === id)!,
    );
    state.existingSkillDirectories = ['.agents/skills', '.claude/skills'];
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

  it('writes directly to one existing skill directory without creating aliases', () => {
    const state = buildState('/repo');
    state.detectedAgents = ['universal', 'claude-code'].map(
      (id) => AGENT_SKILL_TARGETS.find((target) => target.id === id)!,
    );
    state.existingSkillDirectories = ['.claude/skills'];
    const features = [CustomFunctionSetupFeature.Skill];
    const paths = getPlanningCandidatePaths(state, { features });
    const plan = buildInitPlan(buildInput(state, absentSnapshots(paths)), { features });
    const skillChanges = plan.changes.filter(
      (change) => change.kind !== 'command' && change.path.includes('/skills/'),
    );

    expect(skillChanges).toEqual([
      expect.objectContaining({
        kind: 'file',
        path: join('/repo', '.claude', 'skills', 'transcend-custom-functions', 'SKILL.md'),
      }),
    ]);
    expect(paths.some((path) => path.includes('.agents/skills'))).toBe(false);
  });

  it('refuses a user-modified managed skill instead of overwriting it', () => {
    const state = buildState('/repo');
    state.detectedAgents = [];
    state.existingSkillDirectories = ['.agents/skills'];
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
