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
import { PolicySetupFeature } from '../../../../lib/policy/policy-scaffold-model.js';
import { generatePolicyStarterFiles } from '../../../../lib/policy/policy-scaffold-templates.js';
import { POLICY_SKILL_NAME } from '../../../../lib/policy/policy-skill.js';
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
        "transcend policy lint --dir 'transcend/policy' --noInteractive",
        "Edit 'transcend/policy/policy_engine/example/result.rego'",
      ],
      features: [],
      aiHandoff: expect.stringContaining('policy document tree'),
      tools: { opa: '1.13.1', regal: '0.42.0' },
    });
    expect(invocations).toEqual(['opa version', 'regal version']);
    expect(context.stderr).toBe('');
    expect(existsSync(join(root, 'manifest.json'))).toBe(false);
    expect(existsSync(join(root, '.vscode'))).toBe(false);
    expect(existsSync(join(root, '.agents'))).toBe(false);
    expect(existsSync(join(root, '.github'))).toBe(false);
  });

  it('previews the complete plan without writing any files', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'custom-policy');
    mkdirSync(join(root, '.git'), { recursive: true });
    writeFileSync(
      join(root, '.git', 'config'),
      '[remote "origin"]\n  url = git@github.com:transcend-io/example.git\n',
    );
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });

    await init.call(
      context,
      buildFlags({
        editor: true,
        skill: true,
        ci: true,
        dryRun: true,
        yes: false,
      }),
      target,
      buildRunner(),
    );

    expect(existsSync(target)).toBe(false);
    expect(existsSync(join(root, '.vscode'))).toBe(false);
    expect(existsSync(join(root, '.agents'))).toBe(false);
    expect(existsSync(join(root, '.github'))).toBe(false);
    expect(JSON.parse(context.stdout)).toMatchObject({
      applied: false,
      dryRun: true,
      targetDirectory: target,
      features: Object.values(PolicySetupFeature),
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
    mkdirSync(join(root, '.git'), { recursive: true });
    writeFileSync(
      join(root, '.git', 'config'),
      '[remote "origin"]\n  url = https://github.com/transcend-io/example.git\n',
    );
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });
    const flags = buildFlags({ editor: true, skill: true, ci: true });

    await init.call(context, flags, target, buildRunner());
    writeFileSync(join(target, 'input.json'), '{"local": true}\n');

    context.reset();
    await init.call(context, flags, target, buildRunner());

    expect(JSON.parse(context.stdout)).toMatchObject({
      applied: false,
      dryRun: false,
      targetDirectory: target,
      changes: [],
      warnings: [],
      features: Object.values(PolicySetupFeature),
    });
    expect(readFileSync(join(target, 'input.json'), 'utf8')).toBe('{"local": true}\n');
    expect(existsSync(join(root, '.vscode', 'settings.json'))).toBe(true);
    expect(existsSync(join(root, '.agents', 'skills', POLICY_SKILL_NAME, 'SKILL.md'))).toBe(true);
    expect(existsSync(join(root, '.github', 'workflows', 'transcend-policy.yml'))).toBe(true);
  });

  it('selects editor, skill, and CI by default in the interactive checklist', async () => {
    const root = makeTemporaryRoot();
    mkdirSync(join(root, '.git'), { recursive: true });
    writeFileSync(
      join(root, '.git', 'config'),
      '[remote "origin"]\n  url = git@github.com:transcend-io/example.git\n',
    );
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: true,
      stderrIsTTY: true,
    });
    const checkbox = vi
      .spyOn(ScaffoldPrompts.prototype, 'checkbox')
      .mockResolvedValueOnce(Object.values(PolicySetupFeature));
    vi.spyOn(ScaffoldPrompts.prototype, 'confirm').mockResolvedValueOnce(true);

    await init.call(
      context,
      buildFlags({
        noInteractive: false,
        yes: false,
        json: false,
      }),
      undefined,
      buildRunner(),
    );

    const choices = checkbox.mock.calls[0]![1];
    expect(choices.map(({ value, checked }) => ({ value, checked }))).toEqual([
      { value: PolicySetupFeature.Editor, checked: true },
      { value: PolicySetupFeature.Skill, checked: true },
      { value: PolicySetupFeature.Ci, checked: true },
    ]);
    expect(existsSync(join(root, '.vscode', 'settings.json'))).toBe(true);
    expect(existsSync(join(root, '.agents', 'skills', POLICY_SKILL_NAME, 'SKILL.md'))).toBe(true);
    expect(existsSync(join(root, '.github', 'workflows', 'transcend-policy.yml'))).toBe(true);
  });

  it('installs repository-level editor and skill setup in a bare project', async () => {
    const root = makeTemporaryRoot();
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });

    await init.call(
      context,
      buildFlags({ editor: true, skill: true, ci: true }),
      undefined,
      buildRunner(),
    );

    const target = join(root, 'transcend', 'policy');
    expect(existsSync(join(root, '.vscode', 'settings.json'))).toBe(true);
    expect(existsSync(join(target, '.vscode'))).toBe(false);
    expect(existsSync(join(root, '.agents', 'skills', POLICY_SKILL_NAME, 'SKILL.md'))).toBe(true);
    expect(existsSync(join(root, '.github'))).toBe(false);
    expect(JSON.parse(context.stdout)).toMatchObject({
      applied: true,
      features: Object.values(PolicySetupFeature),
      warnings: [expect.stringContaining('not inside a detected GitHub repository')],
    });
  });

  it('installs directly into one compatible existing project skill directory', async () => {
    const root = makeTemporaryRoot();
    mkdirSync(join(root, '.claude', 'skills', 'existing'), { recursive: true });
    writeFileSync(
      join(root, '.claude', 'skills', 'existing', 'SKILL.md'),
      '---\nname: existing\ndescription: Existing guidance\n---\n',
    );
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });

    await init.call(context, buildFlags({ skill: true }), undefined, buildRunner());

    expect(existsSync(join(root, '.claude', 'skills', POLICY_SKILL_NAME, 'SKILL.md'))).toBe(true);
    expect(existsSync(join(root, '.agents'))).toBe(false);
  });

  it('keeps custom apostrophe paths relative and shell-safe across output and setup', async () => {
    const root = makeTemporaryRoot();
    mkdirSync(join(root, '.git'), { recursive: true });
    writeFileSync(
      join(root, '.git', 'config'),
      '[remote "origin"]\n  url = https://github.com/transcend-io/example.git\n',
    );
    const directory = "policies/customer's policy";
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });

    await init.call(context, buildFlags({ editor: true, ci: true }), directory, buildRunner());

    const tasks = JSON.parse(readFileSync(join(root, '.vscode', 'tasks.json'), 'utf8')) as {
      /** Generated VS Code tasks. */
      tasks: {
        /** Shell-safe task arguments. */
        args: string[];
      }[];
    };
    expect(tasks.tasks[0]!.args).toEqual(['policy', 'lint', '--dir', directory, '--noInteractive']);
    const workflow = readFileSync(
      join(root, '.github', 'workflows', 'transcend-policy.yml'),
      'utf8',
    );
    expect(workflow).toContain(`POLICY_DIRECTORY: ${JSON.stringify(directory)}`);
    const result = JSON.parse(context.stdout);
    expect(result.nextSteps[0]).toBe(
      "transcend policy lint --dir 'policies/customer'\\''s policy' --noInteractive",
    );
    expect(result.aiHandoff).not.toContain('\n');
    expect(result.aiHandoff).toContain('adapt the generated GitHub Actions validation');
    expect(result.aiHandoff).toContain('rerun transcend policy lint');
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

  it('preserves customized editor, skill, and workflow artifacts on rerun', async () => {
    const root = makeTemporaryRoot();
    mkdirSync(join(root, '.git'), { recursive: true });
    writeFileSync(
      join(root, '.git', 'config'),
      '[remote "origin"]\n  url = https://github.com/transcend-io/example.git\n',
    );
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });
    const flags = buildFlags({ editor: true, skill: true, ci: true });
    await init.call(context, flags, undefined, buildRunner());

    const settingsPath = join(root, '.vscode', 'settings.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8')) as Record<string, unknown>;
    settings['opa.strictMode'] = false;
    const customizedSettings = `${JSON.stringify(settings, null, 2)}\n`;
    writeFileSync(settingsPath, customizedSettings);

    const skillPath = join(root, '.agents', 'skills', POLICY_SKILL_NAME, 'SKILL.md');
    const customizedSkill = readFileSync(skillPath, 'utf8').replace(
      'Use the CLI for deterministic scaffolding',
      'Use the repository policy workflow',
    );
    writeFileSync(skillPath, customizedSkill);

    const workflowPath = join(root, '.github', 'workflows', 'transcend-policy.yml');
    const customizedWorkflow = `${readFileSync(workflowPath, 'utf8')}# Repository customization.\n`;
    writeFileSync(workflowPath, customizedWorkflow);

    context.reset();
    await init.call(context, flags, undefined, buildRunner());

    expect(readFileSync(settingsPath, 'utf8')).toBe(customizedSettings);
    expect(readFileSync(skillPath, 'utf8')).toBe(customizedSkill);
    expect(readFileSync(workflowPath, 'utf8')).toBe(customizedWorkflow);
    expect(JSON.parse(context.stdout)).toMatchObject({
      applied: false,
      changes: [],
      warnings: expect.arrayContaining([
        expect.stringContaining('opa.strictMode'),
        expect.stringContaining('Customized managed skill file was left unchanged'),
        expect.stringContaining('Existing GitHub Actions workflow was left unchanged'),
      ]),
    });
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
    expect(lines).toContain("transcend policy lint --dir 'transcend/policy' --noInteractive");
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
    vi.spyOn(ScaffoldPrompts.prototype, 'checkbox').mockRejectedValueOnce(
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
        if (property === 'linkSync') {
          return (existingPath: PathLike, newPath: PathLike): void => {
            if (!failed && String(newPath).endsWith(join('.regal', 'config.yaml'))) {
              failed = true;
              throw new Error('simulated policy write failure');
            }
            targetFs.linkSync(existingPath, newPath);
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
