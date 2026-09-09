import { describe, expect, it } from 'vitest';

import { planFileChange } from '../project-plan.js';

describe('planFileChange', () => {
  it('returns no change for identical managed contents without mutating the snapshot', () => {
    const snapshot = Object.freeze({
      path: '/repo/deno.json',
      contents: '{}\n',
      mode: 0o100640,
    });

    expect(
      planFileChange({
        snapshot,
        after: '{}\n',
        description: 'Merge Deno configuration',
      }),
    ).toBeUndefined();
    expect(snapshot).toEqual({
      path: '/repo/deno.json',
      contents: '{}\n',
      mode: 0o100640,
    });
  });

  it('preserves the original mode in a planned update', () => {
    expect(
      planFileChange({
        snapshot: {
          path: '/repo/deno.json',
          contents: '{}\n',
          mode: 0o100640,
        },
        after: '{"lint": {}}\n',
        description: 'Merge Deno configuration',
      }),
    ).toEqual({
      kind: 'file',
      path: '/repo/deno.json',
      before: '{}\n',
      after: '{"lint": {}}\n',
      description: 'Merge Deno configuration',
      mode: 0o100640,
    });
  });

  it('refuses an existing create-only file even when its contents match', () => {
    expect(() =>
      planFileChange({
        snapshot: {
          path: '/repo/functions/score-lead.ts',
          contents: 'export default function scoreLead() {}\n',
        },
        after: 'export default function scoreLead() {}\n',
        description: 'Create Score Lead source',
        createOnly: true,
      }),
    ).toThrow('Refusing to overwrite existing file: /repo/functions/score-lead.ts');
  });
});
