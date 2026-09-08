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

import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  CapturedProcessResult,
  CapturedProcessRunner,
} from '../../../../lib/cli/run-captured-process.js';
import { OPA_INSTALL_URL, REGAL_INSTALL_URL } from '../../../../lib/policy/policy-runtime.js';
import { generatePolicyStarterFiles } from '../../../../lib/policy/policy-scaffold-templates.js';
import { PromptCancelledError, ScaffoldPrompts } from '../../../../lib/scaffolding/prompts.js';
import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { init, type PolicyInitFlags } from '../impl.js';

/** Successful tool response without output. */
const SUCCESS: CapturedProcessResult = { code: 0, stdout: '', stderr: '' };

const temporaryRoots: string[] = [];

/**
 * Create and register an isolated temporary directory.
 *
 * @returns Temporary directory
 */
function makeTemporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'policy-init-'));
  temporaryRoots.push(root);
  return root;
}

/**
 * Build complete non-interactive initialization flags.
 *
 * @param overrides - Flag values to replace
 * @returns Complete flags
 */
function buildFlags(overrides: Partial<PolicyInitFlags> = {}): PolicyInitFlags {
  return {
    noInteractive: true,
    dryRun: false,
    yes: true,
    json: true,
    ...overrides,
  };
}

/**
 * Build a deterministic policy runtime runner.
 *
 * @param overrides - Tool results replacing compatible defaults
 * @param invocations - Optional destination for command names
 * @returns Captured process runner
 */
function buildRunner(
  overrides: {
    /** OPA version result. */
    opa?: CapturedProcessResult;
    /** Regal version result. */
    regal?: CapturedProcessResult;
  } = {},
  invocations: string[] = [],
): CapturedProcessRunner {
  return (command, args) => {
    invocations.push(`${command} ${args.join(' ')}`);
    if (command === 'opa') {
      return Promise.resolve(overrides.opa ?? { ...SUCCESS, stdout: 'Version: 1.13.1\n' });
    }
    return Promise.resolve(overrides.regal ?? { ...SUCCESS, stdout: 'Version:       0.42.0\n' });
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  temporaryRoots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

describe('policy init', () => {
  it('creates the safe default project and emits stable JSON', async () => {
    const root = makeTemporaryRoot();
    const context = buildContextForTest({
      cwd: root,
      env: { HOME: root },
      stdinIsTTY: false,
    });
    const invocations: string[] = [];

    await init.call(context, buildFlags(), undefined, buildRunner({}, invocations));

    const target = join(root, 'transcend', 'policy');
    generatePolicyStarterFiles().forEach((file) => {
      expect(readFileSync(join(target, file.path), 'utf8')).toBe(file.contents);
    });
    expect(JSON.parse(context.stdout)).toEqual({
      version: 1,
      command: 'init',
      applied: true,
      dryRun: false,
      targetDirectory: target,
      manifestPath: join(target, 'manifest.json'),
      changes: generatePolicyStarterFiles().map((file) => ({
        kind: 'create',
        target: `transcend/policy/${file.path}`,
        description: file.description,
      })),
      warnings: [],
      nextSteps: [
        "transcend policy lint --dir 'transcend/policy'",
        "Edit 'transcend/policy/policy_engine/example/result.rego'",
      ],
      aiHandoff: expect.stringContaining('OPA document tree'),
      tools: { opa: '1.13.1', regal: '0.42.0' },
    });
    expect(invocations).toEqual(['opa version', 'regal version']);
    expect(context.stderr).toBe('');
    expect(existsSync(join(root, 'manifest.json'))).toBe(false);
  });

  it('previews the complete plan without writing any files', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'custom-policy');
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });

    await init.call(context, buildFlags({ dryRun: true, yes: false }), target, buildRunner());

    expect(existsSync(target)).toBe(false);
    expect(JSON.parse(context.stdout)).toMatchObject({
      applied: false,
      dryRun: true,
      targetDirectory: target,
      changes: expect.arrayContaining([
        expect.objectContaining({
          kind: 'create',
          target: 'custom-policy/manifest.json',
        }),
      ]),
    });
    expect(context.stderr).toBe('');
  });

  it('applies once and reports an idempotent no-op with a local private input', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'policy');
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });

    await init.call(context, buildFlags(), target, buildRunner());
    writeFileSync(join(target, 'input.json'), '{"local": true}\n');

    context.reset();
    await init.call(context, buildFlags(), target, buildRunner());

    expect(JSON.parse(context.stdout)).toMatchObject({
      applied: false,
      dryRun: false,
      targetDirectory: target,
      changes: [],
      warnings: [],
    });
    expect(readFileSync(join(target, 'input.json'), 'utf8')).toBe('{"local": true}\n');
  });

  it('preserves every existing target file and reports actionable warnings', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'policy');
    mkdirSync(join(target, '.regal'), { recursive: true });
    mkdirSync(join(target, 'custom'), { recursive: true });
    const existing = new Map([
      [join(target, 'manifest.json'), '{"roots":["custom"]}\n'],
      [join(target, '.regal', 'config.yaml'), 'project:\n  roots:\n    - custom\n'],
      [join(target, 'README.md'), '# Existing guide\n'],
      [join(target, 'custom', 'allow.rego'), 'package custom\n\ndefault allow := false\n'],
    ]);
    existing.forEach((contents, path) => writeFileSync(path, contents));
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });

    await init.call(context, buildFlags(), target, buildRunner());

    existing.forEach((contents, path) => {
      expect(readFileSync(path, 'utf8')).toBe(contents);
    });
    expect(existsSync(join(target, 'policy_engine'))).toBe(false);
    const result = JSON.parse(context.stdout);
    expect(result.applied).toBe(false);
    expect(result.changes).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('manifest.json'),
        expect.stringContaining('config.yaml'),
        expect.stringContaining('README.md'),
        expect.stringContaining('no starter files were added or overwritten'),
      ]),
    );
  });

  it('renders a colored plan followed by raw unpadded next steps and AI handoff', async () => {
    const root = makeTemporaryRoot();
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });

    await init.call(context, buildFlags({ json: false }), undefined, buildRunner());

    expect(context.stdout).toContain('Policy initialization plan');
    expect(context.stdout).toContain('Changes');
    expect(context.stdout).toContain('Policy project initialized.');
    const lines = context.stdout.split('\n');
    expect(lines).toContain("transcend policy lint --dir 'transcend/policy'");
    expect(lines).toContain("Edit 'transcend/policy/policy_engine/example/result.rego'");
    const handoffHeading = lines.indexOf('AI handoff — paste into your coding agent');
    expect(handoffHeading).toBeGreaterThan(-1);
    expect(lines[handoffHeading + 1]).toMatch(/^Ask /u);
  });

  it('requires explicit approval without an interactive terminal', async () => {
    const root = makeTemporaryRoot();
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });

    await expect(
      init.call(context, buildFlags({ yes: false, json: false }), undefined, buildRunner()),
    ).rejects.toThrow('Review with --dryRun, then pass --yes');
    expect(existsSync(join(root, 'transcend', 'policy'))).toBe(false);
  });

  it('maps interactive prompt cancellation to exit 130 without applying', async () => {
    const root = makeTemporaryRoot();
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: true,
      stderrIsTTY: true,
      exitBehavior: 'record',
    });
    vi.spyOn(ScaffoldPrompts.prototype, 'confirm').mockRejectedValueOnce(
      new PromptCancelledError(),
    );

    await init.call(
      context,
      buildFlags({ noInteractive: false, yes: false, json: false }),
      undefined,
      buildRunner(),
    );

    expect(context.exit).toHaveBeenCalledWith(130);
    expect(existsSync(join(root, 'transcend', 'policy'))).toBe(false);
  });

  it('rejects a target whose symlink ancestor escapes the repository', async () => {
    const root = makeTemporaryRoot();
    const outside = makeTemporaryRoot();
    mkdirSync(join(root, '.git'));
    mkdirSync(join(root, 'transcend'));
    fs.symlinkSync(outside, join(root, 'transcend', 'policy'), 'dir');
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });

    await expect(init.call(context, buildFlags(), undefined, buildRunner())).rejects.toThrow(
      'outside project root through a symlink',
    );
    expect(fs.readdirSync(outside)).toEqual([]);
  });

  it('rolls back earlier starter files when a later atomic write fails', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'policy');
    let failed = false;
    const failingFs = new Proxy(fs, {
      get(targetFs, property, receiver) {
        if (property === 'renameSync') {
          return (oldPath: PathLike, newPath: PathLike): void => {
            if (!failed && String(newPath).endsWith(join('.regal', 'config.yaml'))) {
              failed = true;
              throw new Error('simulated policy write failure');
            }
            targetFs.renameSync(oldPath, newPath);
          };
        }
        return Reflect.get(targetFs, property, receiver);
      },
    });
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
      fs: failingFs,
    });

    await expect(init.call(context, buildFlags(), target, buildRunner())).rejects.toThrow(
      'simulated policy write failure',
    );
    expect(existsSync(join(target, 'manifest.json'))).toBe(false);
    expect(existsSync(join(target, '.regal', 'config.yaml'))).toBe(false);
  });

  it('always probes both runtimes and returns official missing or upgrade guidance', async () => {
    const root = makeTemporaryRoot();
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });
    const invocations: string[] = [];
    const missingOpa = Object.assign(new Error('not found'), { code: 'ENOENT' });

    await init.call(
      context,
      buildFlags({ dryRun: true }),
      undefined,
      buildRunner(
        {
          opa: { ...SUCCESS, code: 1, error: missingOpa },
          regal: { ...SUCCESS, stdout: 'Version: 0.38.1\n' },
        },
        invocations,
      ),
    );

    const result = JSON.parse(context.stdout);
    expect(invocations).toEqual(['opa version', 'regal version']);
    expect(result.tools).toEqual({ opa: null, regal: null });
    expect(result.warnings).toEqual([
      expect.stringContaining(OPA_INSTALL_URL),
      expect.stringMatching(
        new RegExp(`Regal 0\\.39\\.0[\\s\\S]*OPA 1\\.13\\.1[\\s\\S]*${REGAL_INSTALL_URL}`, 'u'),
      ),
    ]);
  });
});
