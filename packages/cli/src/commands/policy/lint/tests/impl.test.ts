import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
  | 'regal lint';

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
          ? { code: 0, stdout: 'Version: 1.18.2\n', stderr: '' }
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
  writeFileSync(join(directory, '.manifest'), JSON.stringify({ roots: ['policy_engine'] }));
  writeFileSync(
    join(directory, 'policy.rego'),
    'package policy_engine\n\nimport rego.v1\n\ndefault allow := false\n',
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
  it('runs format and Regal without opa check or tests', async () => {
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
      tools: { opa: '1.18.2', regal: '0.42.0' },
      checks: [
        { name: 'opa-version', status: 'passed' },
        { name: 'regal-version', status: 'passed' },
        { name: 'format', status: 'passed' },
        { name: 'regal-lint', status: 'passed' },
      ],
      unformattedFiles: [],
      fixedFiles: [],
      diagnostics: [],
    });
    expect(invocations.map(({ command, args }) => [command, ...args])).toEqual([
      ['opa', 'version'],
      ['regal', 'version'],
      ['opa', 'fmt', '--list', directory],
      [
        'regal',
        'lint',
        '--fail-level',
        'warning',
        '--config-file',
        join(directory, '.regal', 'config.yaml'),
        directory,
      ],
    ]);
    expect(invocations.every(({ cwd }) => cwd === directory)).toBe(true);
    expect(context.process.exitCode).not.toBe(1);
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
  });

  it('fails formatting without prompting in JSON/noInteractive mode', async () => {
    const directory = createPolicyProject();
    const context = buildContextForTest({ stdinIsTTY: true, stderrIsTTY: true });
    const { runner } = buildRunner({
      'opa fmt --list': {
        code: 0,
        stdout: `${join(directory, 'policy.rego')}\n`,
        stderr: '',
      },
    });

    await lint.call(context, buildFlags(), directory, runner);

    expect(JSON.parse(context.stdout)).toMatchObject({
      status: 'failed',
      diagnostics: [
        {
          code: 'opa.format-required',
          message: expect.stringContaining('transcend policy lint --fix'),
        },
      ],
    });
    expect(inquirerConfirmBooleanMock).not.toHaveBeenCalled();
    expect(context.process.exitCode).toBe(1);
  });
});
