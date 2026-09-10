import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildManagedAgentSkill } from '../../scaffolding/agent-skill.js';
import type { PlanningPathSnapshot } from '../../scaffolding/project-plan.js';
import { CUSTOM_FUNCTION_SKILL_FILES } from '../custom-function-skill.js';
import { CustomFunctionSetupFeature, type CustomFunctionProjectState } from '../scaffold-model.js';
import {
  buildAddFunctionPlan,
  buildInitPlan,
  EMPTY_CUSTOM_FUNCTION_MANIFEST,
  getAddFunctionPlanningCandidatePaths,
  getInitPlanningCandidatePaths,
  prepareGeneratedCustomFunction,
  type CustomFunctionInitPlanningInput,
} from '../scaffold-planning.js';

/**
 * Build deterministic discovery state without filesystem access.
 *
 * @param root - Synthetic repository root
 * @returns Project discovery state
 */
function buildState(root: string): CustomFunctionProjectState {
  const targetDirectory = join(root, 'custom-functions');
  return {
    invocationDirectory: root,
    targetDirectory,
    projectRoot: root,
    manifestDirectory: targetDirectory,
    manifestPath: join(targetDirectory, 'transcend-functions.yml'),
    repositoryRoot: root,
    denoConfigPath: join(targetDirectory, 'deno.json'),
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
 * Make snapshots with an initialized empty manifest.
 *
 * @param paths - Candidate absolute paths
 * @param state - Project state containing the manifest path
 * @returns Snapshot record
 */
function initializedSnapshots(
  paths: readonly string[],
  state: CustomFunctionProjectState,
): Record<string, PlanningPathSnapshot> {
  return {
    ...absentSnapshots(paths),
    [state.manifestPath]: {
      kind: 'file',
      path: state.manifestPath,
      contents: EMPTY_CUSTOM_FUNCTION_MANIFEST,
      mode: 0o100644,
    },
  };
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
): CustomFunctionInitPlanningInput {
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
    const paths = getInitPlanningCandidatePaths(state, { features });
    const input = buildInput(state, absentSnapshots(paths));
    const before = structuredClone(input);

    expect(buildInitPlan(input, { features })).toEqual(buildInitPlan(input, { features }));
    expect(input).toEqual(before);
  });

  it('produces a no-op plan when rerun against its own desired files', () => {
    const state = buildState('/repo');
    const features = [CustomFunctionSetupFeature.Deno, CustomFunctionSetupFeature.Ci];
    const paths = getInitPlanningCandidatePaths(state, { features });
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

  it('leaves a customized generated workflow unchanged', () => {
    const state = buildState('/repo');
    const features = [CustomFunctionSetupFeature.Ci];
    const paths = getInitPlanningCandidatePaths(state, { features });
    const first = buildInitPlan(buildInput(state, absentSnapshots(paths)), { features });
    const snapshots = snapshotsAfterPlan(paths, first);
    const workflowPath = join('/repo', '.github', 'workflows', 'transcend-custom-functions.yml');
    const workflow = snapshots[workflowPath];
    if (workflow?.kind !== 'file') {
      throw new Error('Expected the first plan to create the workflow.');
    }
    snapshots[workflowPath] = {
      ...workflow,
      contents: `${workflow.contents}\n# Repository-specific customization.\n`,
    };

    const rerun = buildInitPlan(buildInput(state, snapshots), { features });

    expect(rerun.changes.some(({ path }) => path === workflowPath)).toBe(false);
    expect(rerun.unchanged).toContain(workflowPath);
    expect(rerun.warnings).toContain(
      `Existing GitHub Actions workflow was left unchanged: ${workflowPath}`,
    );
  });

  it('updates an unmodified managed workflow', () => {
    const state = buildState('/repo');
    const features = [CustomFunctionSetupFeature.Ci];
    const paths = getInitPlanningCandidatePaths(state, { features });
    const first = buildInitPlan(buildInput(state, absentSnapshots(paths)), { features });
    const snapshots = snapshotsAfterPlan(paths, first);
    const workflowPath = join('/repo', '.github', 'workflows', 'transcend-custom-functions.yml');

    const rerun = buildInitPlan(
      { ...buildInput(state, snapshots), cliVersion: '10.28.0' },
      { features },
    );

    expect(rerun.changes).toContainEqual(
      expect.objectContaining({
        path: workflowPath,
        description: 'Update managed Custom Function checks',
      }),
    );
  });
});

describe('buildAddFunctionPlan', () => {
  it('preserves a custom manifest in every generated follow-up command', () => {
    const state = buildState('/repo');
    state.manifestPath = join(state.manifestDirectory, 'functions.yml');
    const generated = prepareGeneratedCustomFunction('Score Lead', 'general');
    const paths = getAddFunctionPlanningCandidatePaths(state, generated);
    const plan = buildAddFunctionPlan(buildInput(state, initializedSnapshots(paths, state)), {
      generated,
    });
    const commands = plan.nextSteps.filter((step) => step.includes('transcend '));

    expect(commands).toHaveLength(3);
    expect(commands[0]).toContain("--manifest='custom-functions/functions.yml'");
    expect(commands[1]).toContain("--manifest='custom-functions/functions.yml'");
    expect(commands[2]).toContain("--file='custom-functions/functions.yml'");
  });

  it('builds a deterministic manifest, source, and payload plan', () => {
    const state = buildState('/repo');
    const generated = prepareGeneratedCustomFunction('Score Lead', 'general');
    const paths = getAddFunctionPlanningCandidatePaths(state, generated);
    const input = buildInput(state, initializedSnapshots(paths, state));

    const first = buildAddFunctionPlan(input, { generated });
    const second = buildAddFunctionPlan(input, { generated });

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
      const paths = getAddFunctionPlanningCandidatePaths(state, generated);
      const snapshots = initializedSnapshots(paths, state);
      const file = kind === 'source' ? generated.sourceFile : generated.payloadFiles[0]!;
      const destination = join(state.manifestDirectory, file.path);
      snapshots[destination] = {
        kind: 'file',
        path: destination,
        contents: file.contents,
        mode: 0o100644,
      };

      expect(() => buildAddFunctionPlan(buildInput(state, snapshots), { generated })).toThrow(
        `Refusing to overwrite existing file: ${destination}`,
      );
    },
  );

  it('gives guidance for every generated manifest parameter', () => {
    const state = buildState('/repo');
    const generated = prepareGeneratedCustomFunction('DSR Lookup', 'dsr-datapoint');
    generated.manifestEntry.env = {
      ...generated.manifestEntry.env,
      CRM_API_KEY: '<<parameters.CRM_API_KEY>>',
    };
    const paths = getAddFunctionPlanningCandidatePaths(state, generated);
    const plan = buildAddFunctionPlan(buildInput(state, initializedSnapshots(paths, state)), {
      generated,
    });

    expect(plan.warnings).toContain(
      'Supply TRANSCEND_API_KEY, CRM_API_KEY through --variables when running or pushing; never commit secret values.',
    );
    expect(plan.nextSteps).toContainEqual(
      expect.stringContaining(
        "--variables='TRANSCEND_API_KEY:placeholder,CRM_API_KEY:placeholder'",
      ),
    );
  });

  it('rejects case-insensitive collisions with existing repository paths', () => {
    const state = {
      ...buildState('/repo'),
      relativePaths: ['Functions/score-lead.ts'],
    };
    const generated = prepareGeneratedCustomFunction('Score Lead', 'general');
    const paths = getAddFunctionPlanningCandidatePaths(state, generated);

    expect(() =>
      buildAddFunctionPlan(buildInput(state, initializedSnapshots(paths, state)), {
        generated,
      }),
    ).toThrow(
      'Custom Function name "Score Lead" maps to functions/score-lead.ts, which conflicts with existing path Functions/score-lead.ts. Choose another name.',
    );
  });

  it('rejects case-insensitive ancestor directory collisions', () => {
    const state = {
      ...buildState('/repo'),
      relativePaths: ['Functions'],
    };
    const generated = prepareGeneratedCustomFunction('Score Lead', 'general');
    const paths = getAddFunctionPlanningCandidatePaths(state, generated);

    expect(() =>
      buildAddFunctionPlan(buildInput(state, initializedSnapshots(paths, state)), {
        generated,
      }),
    ).toThrow('Case-insensitive path collision: "functions" conflicts with "Functions".');
  });

  it('requires an existing manifest snapshot', () => {
    const state = buildState('/repo');
    const generated = prepareGeneratedCustomFunction('Score Lead', 'general');
    const paths = getAddFunctionPlanningCandidatePaths(state, generated);

    expect(() =>
      buildAddFunctionPlan(buildInput(state, absentSnapshots(paths)), { generated }),
    ).toThrow(`Custom Function manifest does not exist: ${state.manifestPath}`);
  });
});

describe('agent skill planning', () => {
  it('prefers .agents and links only incompatible existing skill directories', () => {
    const state = buildState('/repo');
    state.existingSkillDirectories = [
      { path: '.cursor/skills', supportsAgentsSkills: true },
      { path: '.claude/skills', supportsAgentsSkills: false },
    ];
    const features = [CustomFunctionSetupFeature.Skill];
    const paths = getInitPlanningCandidatePaths(state, { features });
    const first = buildInitPlan(buildInput(state, absentSnapshots(paths)), { features });
    const links = first.changes.filter((change) => change.kind === 'link');

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      path: join('/repo', '.claude', 'skills', 'transcend-custom-functions'),
      target: '../../.agents/skills/transcend-custom-functions',
    });
    expect(paths).toContain(
      join('/repo', '.agents', 'skills', 'transcend-custom-functions', 'SKILL.md'),
    );
    expect(paths).toContain(
      join('/repo', '.agents', 'skills', 'transcend-custom-functions', 'references', 'setup.md'),
    );
    expect(paths).toContain(
      join('/repo', '.cursor', 'skills', 'transcend-custom-functions', 'SKILL.md'),
    );

    const rerun = buildInitPlan(buildInput(state, snapshotsAfterPlan(paths, first)), { features });
    expect(rerun.changes).toEqual([]);
    expect(rerun.unchanged).toContain(links[0]!.path);

    const copiedSnapshots = snapshotsAfterPlan(paths, first);
    copiedSnapshots[links[0]!.path] = { kind: 'directory', path: links[0]!.path };
    links[0]!.fallbackFiles.forEach((file) => {
      const path = join(links[0]!.path, file.path);
      copiedSnapshots[path] = {
        kind: 'file',
        path,
        contents: file.contents,
        mode: 0o100644,
      };
    });
    const copiedRerun = buildInitPlan(buildInput(state, copiedSnapshots), { features });
    expect(copiedRerun.changes).toEqual([]);
  });

  it('updates a prior managed canonical copy after directory preference changes', () => {
    const state = buildState('/repo');
    state.existingSkillDirectories = [
      { path: '.cursor/skills', supportsAgentsSkills: true },
      { path: '.claude/skills', supportsAgentsSkills: false },
    ];
    const features = [CustomFunctionSetupFeature.Skill];
    const paths = getInitPlanningCandidatePaths(state, { features });
    const snapshots = absentSnapshots(paths);
    CUSTOM_FUNCTION_SKILL_FILES.forEach((file) => {
      const path = join('/repo', '.cursor', 'skills', 'transcend-custom-functions', file.path);
      snapshots[path] = {
        kind: 'file',
        path,
        contents: buildManagedAgentSkill(
          `${file.contents.trimEnd()}\n\nPrior managed revision.\n`,
          '@transcend-io/cli',
        ),
        mode: 0o100644,
      };
    });

    const plan = buildInitPlan(buildInput(state, snapshots), { features });

    expect(
      plan.changes.filter(({ path }) => path.includes('.cursor/skills/transcend-custom-functions')),
    ).toHaveLength(CUSTOM_FUNCTION_SKILL_FILES.length);
  });

  it('writes directly to one existing skill directory without creating aliases', () => {
    const state = buildState('/repo');
    state.existingSkillDirectories = [{ path: '.claude/skills', supportsAgentsSkills: false }];
    const features = [CustomFunctionSetupFeature.Skill];
    const paths = getInitPlanningCandidatePaths(state, { features });
    const plan = buildInitPlan(buildInput(state, absentSnapshots(paths)), { features });
    const skillChanges = plan.changes.filter((change) => change.path.includes('/skills/'));

    expect(skillChanges.map(({ path }) => path)).toEqual([
      join('/repo', '.claude', 'skills', 'transcend-custom-functions', 'SKILL.md'),
      join('/repo', '.claude', 'skills', 'transcend-custom-functions', 'references', 'setup.md'),
      join(
        '/repo',
        '.claude',
        'skills',
        'transcend-custom-functions',
        'references',
        'writing-custom-functions.md',
      ),
    ]);
    expect(skillChanges.every((change) => change.kind === 'file')).toBe(true);
    expect(paths.some((path) => path.includes('.agents/skills'))).toBe(false);
  });

  it('refuses a user-modified managed skill instead of overwriting it', () => {
    const state = buildState('/repo');
    const features = [CustomFunctionSetupFeature.Skill];
    const paths = getInitPlanningCandidatePaths(state, { features });
    const first = buildInitPlan(buildInput(state, absentSnapshots(paths)), { features });
    const snapshots = snapshotsAfterPlan(paths, first);
    const skillPath = join('/repo', '.agents', 'skills', 'transcend-custom-functions', 'SKILL.md');
    const skill = snapshots[skillPath]!;
    if (skill.kind !== 'file') {
      throw new Error('Expected the first plan to create the canonical skill.');
    }
    snapshots[skillPath] = {
      ...skill,
      contents: skill.contents.replace('Sets up, implements', 'Customizes, implements'),
    };

    expect(() => buildInitPlan(buildInput(state, snapshots), { features })).toThrow(
      `Refusing to replace user-managed skill: ${skillPath}`,
    );
  });
});
