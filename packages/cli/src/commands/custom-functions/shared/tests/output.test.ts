import { describe, expect, it } from 'vitest';

import type { CustomFunctionProjectPlan } from '../model.js';
import { buildPlanResult, renderProjectPlan } from '../output.js';

const PLAN: CustomFunctionProjectPlan = {
  version: 1,
  command: 'new',
  targetDirectory: '/repo/custom-functions',
  manifestPath: '/repo/custom-functions/transcend-functions.yml',
  changes: [
    {
      kind: 'file',
      path: '/repo/custom-functions/functions/score-lead.ts',
      before: null,
      after: 'private source contents\n',
      description: 'Create Score Lead source',
      createOnly: true,
    },
    {
      kind: 'link',
      path: '/repo/.claude/skills/transcend-custom-functions',
      target: '../../.agents/skills/transcend-custom-functions',
      fallbackContents: 'private skill contents\n',
      description: 'Expose the canonical skill to Claude Code',
    },
    {
      kind: 'command',
      command: 'deno',
      args: ['fmt', 'functions/score-lead.ts'],
      cwd: '/repo',
      description: 'format generated sources',
      rollbackFiles: [],
    },
  ],
  unchanged: [],
  warnings: ['Commit generated files before deploying.'],
  nextSteps: ['transcend custom-functions check custom-functions'],
};

describe('buildPlanResult', () => {
  it('emits stable JSON without internal file contents and leaves the plan unchanged', () => {
    const before = structuredClone(PLAN);
    const first = buildPlanResult(PLAN, {
      applied: false,
      dryRun: true,
      cwd: '/repo',
    });
    const second = buildPlanResult(PLAN, {
      applied: false,
      dryRun: true,
      cwd: '/repo',
    });

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first).toEqual({
      version: 1,
      command: 'new',
      applied: false,
      dryRun: true,
      targetDirectory: '/repo/custom-functions',
      manifestPath: '/repo/custom-functions/transcend-functions.yml',
      changes: [
        {
          kind: 'create',
          target: 'custom-functions/functions/score-lead.ts',
          description: 'Create Score Lead source',
        },
        {
          kind: 'link',
          target:
            '.claude/skills/transcend-custom-functions -> ../../.agents/skills/transcend-custom-functions',
          description: 'Expose the canonical skill to Claude Code',
        },
        {
          kind: 'command',
          target: 'deno fmt functions/score-lead.ts',
          description: 'format generated sources',
        },
      ],
      warnings: ['Commit generated files before deploying.'],
      nextSteps: ['transcend custom-functions check custom-functions'],
    });
    expect(JSON.stringify(first)).not.toContain('private source contents');
    expect(JSON.stringify(first)).not.toContain('private skill contents');
    expect(PLAN).toEqual(before);
  });
});

describe('renderProjectPlan', () => {
  it('renders an explicit no-op result', () => {
    const noOpPlan: CustomFunctionProjectPlan = {
      ...PLAN,
      command: 'init',
      changes: [],
      warnings: [],
      nextSteps: [],
    };

    expect(renderProjectPlan(noOpPlan, '/repo')).toContain('No changes needed.');
  });
});
