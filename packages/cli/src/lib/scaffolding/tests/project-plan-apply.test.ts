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

import { buildContextForTest } from '../../tests/helpers/buildContextForTest.js';
import { applyProjectPlan } from '../project-plan-apply.js';
import type { PlannedChange, ProjectPlan } from '../project-plan.js';

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
 * @param rootDirectory - Approved mutation root
 * @param changes - Staged mutations
 * @returns Complete project plan
 */
function buildPlan(rootDirectory: string, changes: PlannedChange[]): ProjectPlan {
  return { rootDirectory, changes };
}

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

describe('applyProjectPlan preflight', () => {
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

    await expect(applyProjectPlan(buildContextForTest({ cwd: root }), plan)).rejects.toThrow(
      `File changed after preview: ${changed}`,
    );
    expect(existsSync(appeared)).toBe(false);
    expect(readFileSync(changed, 'utf8')).toBe('{"strict": "changed after preview"}\n');
  });

  it('rejects a destination whose symlink ancestor escapes the project root', async () => {
    const root = makeTemporaryRoot();
    const outside = makeTemporaryRoot();
    const linkedDirectory = join(root, 'functions');
    const destination = join(linkedDirectory, 'example.ts');
    fs.symlinkSync(outside, linkedDirectory, 'dir');
    const plan = buildPlan(root, [
      {
        kind: 'file',
        path: destination,
        before: null,
        after: 'export default 1;\n',
        description: 'Create source',
        createOnly: true,
      },
    ]);

    await expect(applyProjectPlan(buildContextForTest({ cwd: root }), plan)).rejects.toThrow(
      'outside project root through a symlink',
    );
    expect(existsSync(join(outside, 'example.ts'))).toBe(false);
  });

  it('rejects an existing file replaced by a symlink after preview', async () => {
    const root = makeTemporaryRoot();
    const destination = join(root, 'settings.json');
    const replacement = join(root, 'replacement.json');
    writeFileSync(destination, '{}\n');
    writeFileSync(replacement, '{}\n');
    const plan = buildPlan(root, [
      {
        kind: 'file',
        path: destination,
        before: '{}\n',
        after: '{"updated": true}\n',
        description: 'Merge editor settings',
      },
    ]);
    rmSync(destination);
    fs.symlinkSync(replacement, destination);

    await expect(applyProjectPlan(buildContextForTest({ cwd: root }), plan)).rejects.toThrow(
      `File changed after preview: ${destination}`,
    );
    expect(fs.lstatSync(destination).isSymbolicLink()).toBe(true);
    expect(readFileSync(replacement, 'utf8')).toBe('{}\n');
  });

  it('rejects unrelated target content added after preview', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'policy');
    const destination = join(target, 'manifest.json');
    mkdirSync(target);
    const plan: ProjectPlan = {
      rootDirectory: root,
      directoryPreconditions: [{ path: target, relativePaths: [] }],
      changes: [
        {
          kind: 'file',
          path: destination,
          before: null,
          after: '{"roots":["policy_engine"]}\n',
          description: 'Create policy manifest',
          createOnly: true,
        },
      ],
    };
    writeFileSync(join(target, 'README.md'), '# Existing project\n');

    await expect(applyProjectPlan(buildContextForTest({ cwd: root }), plan)).rejects.toThrow(
      `Directory changed after preview: ${target}`,
    );
    expect(existsSync(destination)).toBe(false);
  });
});

describe('applyProjectPlan rollback', () => {
  it('restores earlier files after a later atomic write fails', async () => {
    const root = makeTemporaryRoot();
    const first = join(root, 'first.json');
    const second = join(root, 'second.json');
    writeFileSync(first, 'first before\n');
    writeFileSync(second, 'second before\n');
    const failingFs = new Proxy(fs, {
      get(target, property, receiver) {
        if (property === 'renameSync') {
          return (oldPath: PathLike, newPath: PathLike): void => {
            if (String(newPath) === second) {
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
      applyProjectPlan(buildContextForTest({ cwd: root, fs: failingFs }), plan),
    ).rejects.toThrow('simulated atomic rename failure');
    expect(readFileSync(first, 'utf8')).toBe('first before\n');
    expect(readFileSync(second, 'utf8')).toBe('second before\n');
  });

  it('does not replace a create-only file that appears during apply', async () => {
    const root = makeTemporaryRoot();
    const destination = join(root, 'function.ts');
    const racingFs = new Proxy(fs, {
      get(target, property, receiver) {
        if (property === 'linkSync') {
          return (existingPath: PathLike, newPath: PathLike): void => {
            writeFileSync(newPath, 'appeared during apply\n');
            target.linkSync(existingPath, newPath);
          };
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const plan = buildPlan(root, [
      {
        kind: 'file',
        path: destination,
        before: null,
        after: 'generated\n',
        createOnly: true,
        description: 'Create source',
      },
    ]);

    await expect(
      applyProjectPlan(buildContextForTest({ cwd: root, fs: racingFs }), plan),
    ).rejects.toThrow();
    expect(readFileSync(destination, 'utf8')).toBe('appeared during apply\n');
  });

  it('removes newly created parent directories after a failed apply', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'transcend', 'policy');
    const first = join(target, 'manifest.json');
    const second = join(target, '.regal', 'config.yaml');
    let failed = false;
    const failingFs = new Proxy(fs, {
      get(targetFs, property, receiver) {
        if (property === 'linkSync') {
          return (existingPath: PathLike, newPath: PathLike): void => {
            if (!failed && String(newPath) === second) {
              failed = true;
              throw new Error('simulated create failure');
            }
            targetFs.linkSync(existingPath, newPath);
          };
        }
        return Reflect.get(targetFs, property, receiver);
      },
    });
    const plan = buildPlan(root, [
      {
        kind: 'file',
        path: first,
        before: null,
        after: '{"roots":["policy_engine"]}\n',
        createOnly: true,
        description: 'Create policy manifest',
      },
      {
        kind: 'file',
        path: second,
        before: null,
        after: 'rules: {}\n',
        createOnly: true,
        description: 'Create Regal configuration',
      },
    ]);

    await expect(
      applyProjectPlan(buildContextForTest({ cwd: root, fs: failingFs }), plan),
    ).rejects.toThrow('simulated create failure');
    expect(existsSync(join(root, 'transcend'))).toBe(false);

    await applyProjectPlan(buildContextForTest({ cwd: root }), plan);
    expect(readFileSync(first, 'utf8')).toContain('policy_engine');
    expect(readFileSync(second, 'utf8')).toBe('rules: {}\n');
  });
});

describe('applyProjectPlan skill links', () => {
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
        fallbackFiles: [
          { path: 'SKILL.md', contents: '# Transcend Custom Functions\n' },
          { path: 'references/setup.md', contents: '# Setup\n' },
        ],
        description: 'Expose the canonical skill',
      },
    ]);

    await applyProjectPlan(buildContextForTest({ cwd: root, fs: linklessFs }), plan);

    expect(readFileSync(join(linkPath, 'SKILL.md'), 'utf8')).toBe('# Transcend Custom Functions\n');
    expect(readFileSync(join(linkPath, 'references', 'setup.md'), 'utf8')).toBe('# Setup\n');
  });
});
