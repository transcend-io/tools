import fs, {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  type PathLike,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type {
  CustomFunctionProjectPlan,
  PlannedChange,
} from '../../../lib/custom-functions/scaffold-model.js';
import { buildContextForTest } from '../../../lib/tests/helpers/buildContextForTest.js';
import { applyCustomFunctionProjectPlan } from '../project-plan-apply.js';

const temporaryRoots: string[] = [];

/**
 * Create and register an isolated temporary directory.
 *
 * @returns Temporary directory
 */
function makeTemporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'custom-function-apply-'));
  temporaryRoots.push(root);
  return root;
}

/**
 * Wrap staged changes in a complete project plan.
 *
 * @param root - Project root
 * @param changes - Staged mutations
 * @returns Complete project plan
 */
function buildPlan(root: string, changes: PlannedChange[]): CustomFunctionProjectPlan {
  return {
    version: 1,
    command: 'init',
    targetDirectory: root,
    manifestPath: join(root, 'transcend-functions.yml'),
    changes,
    unchanged: [],
    warnings: [],
    nextSteps: [],
  };
}

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

describe('applyCustomFunctionProjectPlan preflight', () => {
  it('rejects changed-since-preview input before writing any plan entry', async () => {
    const root = makeTemporaryRoot();
    const appeared = join(root, 'created.ts');
    const changed = join(root, 'deno.json');
    writeFileSync(changed, '{"strict": false}\n');
    const plan = buildPlan(root, [
      {
        kind: 'file',
        path: appeared,
        before: null,
        after: 'export default 1;\n',
        description: 'Create source',
      },
      {
        kind: 'file',
        path: changed,
        before: '{"strict": false}\n',
        after: '{"strict": true}\n',
        description: 'Merge Deno configuration',
      },
    ]);
    writeFileSync(changed, '{"strict": "changed after preview"}\n');

    await expect(
      applyCustomFunctionProjectPlan(buildContextForTest({ cwd: root }), plan),
    ).rejects.toThrow(`File changed after preview: ${changed}`);
    expect(existsSync(appeared)).toBe(false);
    expect(readFileSync(changed, 'utf8')).toBe('{"strict": "changed after preview"}\n');
  });
});

describe('applyCustomFunctionProjectPlan rollback', () => {
  it('restores earlier files after a later atomic write fails', async () => {
    const root = makeTemporaryRoot();
    const first = join(root, 'first.json');
    const second = join(root, 'second.json');
    writeFileSync(first, 'first before\n');
    writeFileSync(second, 'second before\n');
    let failed = false;
    const failingFs = new Proxy(fs, {
      get(target, property, receiver) {
        if (property === 'renameSync') {
          return (oldPath: PathLike, newPath: PathLike): void => {
            if (!failed && String(newPath) === second) {
              failed = true;
              throw new Error('simulated atomic rename failure');
            }
            target.renameSync(oldPath, newPath);
          };
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const plan = buildPlan(root, [
      {
        kind: 'file',
        path: first,
        before: 'first before\n',
        after: 'first after\n',
        description: 'Update first file',
      },
      {
        kind: 'file',
        path: second,
        before: 'second before\n',
        after: 'second after\n',
        description: 'Update second file',
      },
    ]);

    await expect(
      applyCustomFunctionProjectPlan(buildContextForTest({ cwd: root, fs: failingFs }), plan),
    ).rejects.toThrow('simulated atomic rename failure');
    expect(readFileSync(first, 'utf8')).toBe('first before\n');
    expect(readFileSync(second, 'utf8')).toBe('second before\n');
  });
});

describe('applyCustomFunctionProjectPlan skill links', () => {
  it('copies the canonical skill when directory links are unavailable', async () => {
    const root = makeTemporaryRoot();
    const linkPath = join(root, '.claude', 'skills', 'transcend-custom-functions');
    mkdirSync(join(root, '.claude', 'skills'), { recursive: true });
    const linklessFs = new Proxy(fs, {
      get(target, property, receiver) {
        if (property === 'symlinkSync') {
          return (): never => {
            throw Object.assign(new Error('links unavailable'), { code: 'EPERM' });
          };
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const plan = buildPlan(root, [
      {
        kind: 'link',
        path: linkPath,
        target: '../../.agents/skills/transcend-custom-functions',
        fallbackContents: '# Transcend Custom Functions\n',
        description: 'Expose the canonical skill',
      },
    ]);

    await applyCustomFunctionProjectPlan(buildContextForTest({ cwd: root, fs: linklessFs }), plan);

    expect(readFileSync(join(linkPath, 'SKILL.md'), 'utf8')).toBe('# Transcend Custom Functions\n');
  });
});
