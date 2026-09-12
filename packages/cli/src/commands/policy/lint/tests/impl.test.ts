import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  CapturedProcessResult,
  CapturedProcessRunner,
} from '../../../../lib/cli/run-captured-process.js';
import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { lint, type LintCommandFlags } from '../impl.js';

const inquirerConfirmBooleanMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../lib/helpers/inquirer.js', () => ({
  inquirerConfirmBoolean: inquirerConfirmBooleanMock,
}));

type InvocationKey =
  | 'opa version'
  | 'regal version'
  | 'opa fmt --list'
  | 'opa fmt --diff'
  | 'opa fmt --write'
  | 'opa check'
  | 'regal lint'
  | 'opa test';

/** One captured tool invocation. */
interface ToolInvocation {
  /** Executable name. */
  command: string;
  /** Executable arguments. */
  args: readonly string[];
  /** Process working directory. */
  cwd: string;
}

/** Test runner and its captured invocations. */
interface TestRunner {
  /** Captured process adapter. */
  runner: CapturedProcessRunner;
  /** Ordered tool invocations. */
  invocations: ToolInvocation[];
}

/** Successful captured process result. */
const SUCCESS: CapturedProcessResult = { code: 0, stdout: '', stderr: '' };

/**
 * Resolve a stable key for one policy tool invocation.
 *
 * @param command - Executable
 * @param args - Executable arguments
 * @returns Invocation key
 */
function invocationKey(command: string, args: readonly string[]): InvocationKey {
  if (command === 'regal') {
    return args[0] === 'version' ? 'regal version' : 'regal lint';
  }
  if (args[0] === 'fmt') {
    return `opa fmt ${args[1]}` as InvocationKey;
  }
  return `opa ${args[0]}` as InvocationKey;
}

/**
 * Build a deterministic successful runner with selected overrides.
 *
 * @param overrides - Results replacing successful defaults
 * @returns Runner and invocation log
 */
function buildRunner(
  overrides: Partial<Record<InvocationKey, CapturedProcessResult>> = {},
): TestRunner {
  const invocations: ToolInvocation[] = [];
  const runner: CapturedProcessRunner = (command, args, options) => {
    invocations.push({ command, args: [...args], cwd: options.cwd });
    const key = invocationKey(command, args);
    return Promise.resolve(
      overrides[key] ??
        (key === 'opa version'
          ? { code: 0, stdout: 'Version: 1.13.1\n', stderr: '' }
          : key === 'regal version'
            ? { code: 0, stdout: 'Version:       0.42.0\n', stderr: '' }
            : SUCCESS),
    );
  };
  return { runner, invocations };
}

/**
 * Build complete policy lint flags.
 *
 * @param overrides - Flag overrides
 * @returns Complete flags
 */
function buildFlags(overrides: Partial<LintCommandFlags> = {}): LintCommandFlags {
  return {
    fix: false,
    noInteractive: true,
    json: true,
    ...overrides,
  };
}

/**
 * Create a minimal valid policy project.
 *
 * @returns Absolute project directory
 */
function createPolicyProject(): string {
  const directory = mkdtempSync(join(tmpdir(), 'policy-lint-command-'));
  temporaryDirectories.push(directory);
  mkdirSync(join(directory, '.regal'), { recursive: true });
  writeFileSync(join(directory, '.regal', 'config.yaml'), 'project:\n  roots:\n    - .\n');
  writeFileSync(join(directory, 'manifest.json'), JSON.stringify({ roots: ['policy_engine'] }));
  writeFileSync(
    join(directory, 'policy.rego'),
    'package policy_engine\n\nimport rego.v1\n\ndefault allow := false\n',
  );
  writeFileSync(
    join(directory, 'policy_test.rego'),
    'package policy_engine_test\n\nimport rego.v1\n\ntest_policy if { true }\n',
  );
  return directory;
}

const temporaryDirectories: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('policy lint', () => {
  it('runs the complete successful gate against absolute project paths', async () => {
    const directory = createPolicyProject();
    const context = buildContextForTest({ cwd: tmpdir(), stdinIsTTY: false });
    const { runner, invocations } = buildRunner();

    await lint.call(context, buildFlags(), directory, runner);

    const result = JSON.parse(context.stdout);
    expect(result).toEqual({
      version: 1,
      status: 'passed',
      directory,
      fix: false,
      tools: { opa: '1.13.1', regal: '0.42.0' },
      checks: [
        { name: 'manifest', status: 'passed' },
        { name: 'opa-version', status: 'passed' },
        { name: 'regal-version', status: 'passed' },
        { name: 'format', status: 'passed' },
        { name: 'opa-check', status: 'passed' },
        { name: 'regal-lint', status: 'passed' },
        { name: 'opa-test', status: 'passed' },
      ],
      unformattedFiles: [],
      fixedFiles: [],
      diagnostics: [],
    });
    expect(invocations.map(({ command, args }) => [command, ...args])).toEqual([
      ['opa', 'version'],
      ['regal', 'version'],
      ['opa', 'fmt', '--list', directory],
      ['opa', 'check', '--strict', '--v0-compatible', '--ignore', '*_test.rego', directory],
      [
        'regal',
        'lint',
        '--fail-level',
        'warning',
        '--config-file',
        join(directory, '.regal', 'config.yaml'),
        directory,
      ],
      ['opa', 'test', '--fail-on-empty', directory],
    ]);
    expect(invocations.every(({ cwd }) => cwd === directory)).toBe(true);
    expect(context.stdout.trim().split('\n')).toHaveLength(1);
    expect(context.stderr).toBe('');
    expect(context.process.exitCode).not.toBe(1);
  });

  it('resolves a custom relative directory from the invocation directory', async () => {
    const directory = createPolicyProject();
    const context = buildContextForTest({
      cwd: dirname(directory),
      stdinIsTTY: false,
    });
    const { runner } = buildRunner();

    await lint.call(context, buildFlags(), join('.', basename(directory)), runner);

    expect(JSON.parse(context.stdout)).toMatchObject({
      status: 'passed',
      directory,
    });
  });

  it('fails formatting without prompting in JSON/noInteractive mode', async () => {
    const directory = createPolicyProject();
    const context = buildContextForTest({ stdinIsTTY: true, stderrIsTTY: true });
    const { runner, invocations } = buildRunner({
      'opa fmt --list': {
        code: 0,
        stdout: `${join(directory, 'policy.rego')}\n`,
        stderr: '',
      },
    });

    await lint.call(context, buildFlags(), directory, runner);

    expect(JSON.parse(context.stdout)).toMatchObject({
      status: 'failed',
      unformattedFiles: ['policy.rego'],
      fixedFiles: [],
      diagnostics: [{ code: 'opa.format-required', severity: 'error' }],
    });
    expect(inquirerConfirmBooleanMock).not.toHaveBeenCalled();
    expect(invocations.map(({ command, args }) => [command, ...args])).not.toContainEqual([
      'opa',
      'fmt',
      '--write',
      directory,
    ]);
    expect(context.stderr).toBe('');
    expect(context.process.exitCode).toBe(1);
  });

  it('repairs OPA formatting with explicit --fix', async () => {
    const directory = createPolicyProject();
    const context = buildContextForTest({ stdinIsTTY: false });
    const { runner, invocations } = buildRunner({
      'opa fmt --list': {
        code: 0,
        stdout: `${join(directory, 'policy.rego')}\n`,
        stderr: '',
      },
    });

    await lint.call(context, buildFlags({ fix: true }), directory, runner);

    expect(JSON.parse(context.stdout)).toMatchObject({
      status: 'passed',
      fix: true,
      unformattedFiles: ['policy.rego'],
      fixedFiles: ['policy.rego'],
      checks: expect.arrayContaining([{ name: 'format', status: 'passed' }]),
    });
    expect(invocations.map(({ command, args }) => [command, ...args])).toContainEqual([
      'opa',
      'fmt',
      '--write',
      directory,
    ]);
    expect(inquirerConfirmBooleanMock).not.toHaveBeenCalled();
  });

  it('preserves interactive formatting with a diff and confirmation', async () => {
    const directory = createPolicyProject();
    const context = buildContextForTest({ stdinIsTTY: true, stderrIsTTY: true });
    const { runner } = buildRunner({
      'opa fmt --list': {
        code: 0,
        stdout: `${join(directory, 'policy.rego')}\n`,
        stderr: '',
      },
      'opa fmt --diff': {
        code: 0,
        stdout: 'formatted diff',
        stderr: '',
      },
    });
    inquirerConfirmBooleanMock.mockResolvedValueOnce(true);

    await lint.call(context, buildFlags({ json: false, noInteractive: false }), directory, runner);

    expect(inquirerConfirmBooleanMock).toHaveBeenCalledWith({
      message: 'Format the unformatted policy files listed above?',
    });
    expect(context.stdout).toContain('Policy verification');
    expect(context.stdout).toContain('PASS OPA formatting');
    expect(context.stderr).toContain('policy.rego');
    expect(context.stderr).toContain('formatted diff');
  });

  it('does not prompt when stderr is not interactive', async () => {
    const directory = createPolicyProject();
    const context = buildContextForTest({ stdinIsTTY: true, stderrIsTTY: false });
    const { runner } = buildRunner({
      'opa fmt --list': {
        code: 0,
        stdout: `${join(directory, 'policy.rego')}\n`,
        stderr: '',
      },
    });

    await lint.call(context, buildFlags({ json: false, noInteractive: false }), directory, runner);

    expect(inquirerConfirmBooleanMock).not.toHaveBeenCalled();
    expect(context.process.exitCode).toBe(1);
  });

  it('reports missing OPA and an incompatible Regal version with official guidance', async () => {
    const directory = createPolicyProject();
    const context = buildContextForTest({ stdinIsTTY: false });
    const missingError = Object.assign(new Error('spawn opa ENOENT'), { code: 'ENOENT' });
    const { runner } = buildRunner({
      'opa version': { code: 1, stdout: '', stderr: '', error: missingError },
      'regal version': { code: 0, stdout: 'Version: 0.29.2\n', stderr: '' },
    });

    await lint.call(context, buildFlags(), directory, runner);

    const result = JSON.parse(context.stdout);
    expect(result).toMatchObject({
      status: 'failed',
      tools: { opa: null, regal: null },
      checks: [
        { name: 'manifest', status: 'passed' },
        { name: 'opa-version', status: 'failed' },
        { name: 'regal-version', status: 'failed' },
        { name: 'format', status: 'skipped' },
        { name: 'opa-check', status: 'skipped' },
        { name: 'regal-lint', status: 'skipped' },
        { name: 'opa-test', status: 'skipped' },
      ],
    });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'opa.missing',
        message: expect.stringContaining('https://www.openpolicyagent.org/docs#1-download-opa'),
      }),
      expect.objectContaining({
        code: 'regal.version',
        message: expect.stringMatching(
          /Regal 0\.30\.0 or newer[\s\S]*https:\/\/www\.openpolicyagent\.org\/projects\/regal#installing-regal/u,
        ),
      }),
    ]);
  });

  it('reports incompatible OPA and missing Regal with official guidance', async () => {
    const directory = createPolicyProject();
    const context = buildContextForTest({ stdinIsTTY: false });
    const missingError = Object.assign(new Error('spawn regal ENOENT'), { code: 'ENOENT' });
    const { runner } = buildRunner({
      'opa version': { code: 0, stdout: 'Version: 0.68.0\n', stderr: '' },
      'regal version': { code: 1, stdout: '', stderr: '', error: missingError },
    });

    await lint.call(context, buildFlags(), directory, runner);

    const result = JSON.parse(context.stdout);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'opa.version',
        message: expect.stringMatching(
          /OPA 1\.x is required; found 0\.68\.0[\s\S]*https:\/\/www\.openpolicyagent\.org\/docs#1-download-opa/u,
        ),
      }),
      expect.objectContaining({
        code: 'regal.missing',
        message: expect.stringContaining(
          'https://www.openpolicyagent.org/projects/regal#installing-regal',
        ),
      }),
    ]);
  });

  it('fails when manifest roots do not cover a publishable package', async () => {
    const directory = createPolicyProject();
    writeFileSync(join(directory, 'manifest.json'), JSON.stringify({ roots: ['other'] }));
    const context = buildContextForTest({ stdinIsTTY: false });
    const { runner } = buildRunner();

    await lint.call(context, buildFlags(), directory, runner);

    expect(JSON.parse(context.stdout)).toMatchObject({
      status: 'failed',
      checks: expect.arrayContaining([{ name: 'manifest', status: 'failed' }]),
      diagnostics: [
        expect.objectContaining({
          code: 'manifest.invalid',
          message: expect.stringMatching(
            /roots" do not cover[\s\S]*policy\.rego \(package policy_engine\)/u,
          ),
        }),
      ],
    });
  });

  it('fails when opa test reports an empty test suite', async () => {
    const directory = createPolicyProject();
    const context = buildContextForTest({ stdinIsTTY: false });
    const { runner } = buildRunner({
      'opa test': { code: 2, stdout: '', stderr: 'no tests were run' },
    });

    await lint.call(context, buildFlags(), directory, runner);

    expect(JSON.parse(context.stdout)).toMatchObject({
      status: 'failed',
      checks: expect.arrayContaining([{ name: 'opa-test', status: 'failed' }]),
      diagnostics: [
        expect.objectContaining({
          code: 'opa.test',
          message: 'no tests were run',
        }),
      ],
    });
  });

  it('preserves Regal violations and stderr notices in diagnostics', async () => {
    const directory = createPolicyProject();
    const context = buildContextForTest({ stdinIsTTY: false });
    const { runner } = buildRunner({
      'regal lint': {
        code: 3,
        stdout: 'Rule: prefer-package-imports',
        stderr: 'A new version of Regal is available.',
      },
    });

    await lint.call(context, buildFlags(), directory, runner);

    expect(JSON.parse(context.stdout)).toMatchObject({
      status: 'failed',
      diagnostics: [
        expect.objectContaining({
          code: 'regal.lint',
          message: 'Rule: prefer-package-imports\nA new version of Regal is available.',
        }),
      ],
    });
  });

  it('promotes configured Regal warnings into failing diagnostics', async () => {
    const directory = createPolicyProject();
    const context = buildContextForTest({ stdinIsTTY: false });
    const { runner, invocations } = buildRunner({
      'regal lint': {
        code: 2,
        stdout: 'Rule: todo-comment',
        stderr: '',
      },
    });

    await lint.call(context, buildFlags(), directory, runner);

    expect(JSON.parse(context.stdout)).toMatchObject({
      status: 'failed',
      diagnostics: [
        expect.objectContaining({
          code: 'regal.lint',
          message: 'Rule: todo-comment',
        }),
      ],
    });
    expect(invocations.map(({ command, args }) => [command, ...args])).toContainEqual([
      'regal',
      'lint',
      '--fail-level',
      'warning',
      '--config-file',
      join(directory, '.regal', 'config.yaml'),
      directory,
    ]);
  });
});
