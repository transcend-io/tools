import { spawn, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import type { PolicyDependencies } from '../../helpers/index.js';
import { lint } from '../impl.js';

const inquirerConfirmBooleanMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../lib/helpers/inquirer.js', () => ({
  inquirerConfirmBoolean: inquirerConfirmBooleanMock,
}));

/** Result emitted by a fake OPA child process. */
interface FakeOpaResult {
  /** Child process exit code. */
  code: number;
  /** Captured standard output. */
  stdout?: string;
  /** Captured standard error. */
  stderr?: string;
}

describe('lint', () => {
  const context = buildContextForTest({
    env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'false' },
  });
  const opaResults: FakeOpaResult[] = [];
  const spawnMock = vi.fn((_command: string, _args: readonly string[], _options?: unknown) => {
    const child = new EventEmitter();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    Object.assign(child, { stdout, stderr });

    queueMicrotask(() => {
      const result = opaResults.shift() ?? { code: 0 };
      if (result.stdout) {
        stdout.write(result.stdout);
      }
      if (result.stderr) {
        stderr.write(result.stderr);
      }
      child.emit('close', result.code);
    });

    return child as ReturnType<typeof spawn>;
  });
  const spawnSyncMock = vi.fn().mockReturnValue({ status: 0 });
  const dependencies: Pick<PolicyDependencies, 'assertOpaInstalled' | 'runOpa'> = {
    assertOpaInstalled: {
      spawnSync: spawnSyncMock as unknown as typeof spawnSync,
      env: {},
    },
    runOpa: {
      spawn: spawnMock as unknown as typeof spawn,
      env: {},
      stdio: context.process,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    opaResults.length = 0;
    spawnSyncMock.mockReturnValue({ status: 0 });
    context.reset();
  });

  it('runs opa check and fmt, exiting on check failure', async () => {
    opaResults.push({ code: 2 });

    await expect(lint.call(context, { dir: './policies' }, dependencies)).rejects.toMatchObject({
      code: 2,
    });

    expect(spawnSyncMock).toHaveBeenCalledWith('opa', ['version'], {
      env: {},
      stdio: 'ignore',
    });
    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock.mock.calls[0][1]).toEqual(['check', '--strict', expect.any(String)]);
    expect(spawnMock.mock.calls[0][2]).toMatchObject({
      env: {},
      stdio: [context.process.stdin, context.process.stdout, context.process.stderr],
    });
  });

  it('exits when the user declines formatting unformatted files', async () => {
    opaResults.push({ code: 0 }, { code: 0, stdout: '/tmp/policies/policy.rego\n' }, { code: 0 });
    inquirerConfirmBooleanMock.mockResolvedValueOnce(false);

    await expect(lint.call(context, { dir: './policies' }, dependencies)).rejects.toMatchObject({
      code: 1,
    });

    expect(spawnMock.mock.calls[1][1]).toEqual(['fmt', '--list', expect.any(String)]);
    expect(spawnMock.mock.calls[2][1]).toEqual(['fmt', '--diff', expect.any(String)]);
    expect(inquirerConfirmBooleanMock).toHaveBeenCalledWith({
      message: 'Format the unformatted policy files listed above?',
    });
    expect(spawnMock.mock.calls.map((call) => call[1])).not.toContainEqual([
      'fmt',
      '-w',
      expect.any(String),
    ]);
  });

  it('formats unformatted files when the user confirms', async () => {
    opaResults.push(
      { code: 0 },
      { code: 0, stdout: '/tmp/policies/policy.rego\n' },
      { code: 0 },
      { code: 0 },
    );
    inquirerConfirmBooleanMock.mockResolvedValueOnce(true);

    await lint.call(context, { dir: './policies' }, dependencies);

    expect(spawnMock.mock.calls[3][1]).toEqual(['fmt', '-w', expect.any(String)]);
    expect(context.exit).not.toHaveBeenCalled();
  });

  it('exits without prompting in a non-interactive environment', async () => {
    const nonInteractiveContext = buildContextForTest({
      env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'false' },
      stdinIsTTY: false,
    });

    opaResults.push({ code: 0 }, { code: 0, stdout: '/tmp/policies/policy.rego\n' }, { code: 0 });

    const nonInteractiveDependencies = {
      ...dependencies,
      runOpa: {
        ...dependencies.runOpa,
        stdio: nonInteractiveContext.process,
      },
    };

    await expect(
      lint.call(nonInteractiveContext, { dir: './policies' }, nonInteractiveDependencies),
    ).rejects.toMatchObject({ code: 1 });

    expect(inquirerConfirmBooleanMock).not.toHaveBeenCalled();
    expect(spawnMock.mock.calls.map((call) => call[1])).not.toContainEqual([
      'fmt',
      '-w',
      expect.any(String),
    ]);
  });

  it('passes when all files are formatted', async () => {
    opaResults.push({ code: 0 }, { code: 0 });

    await lint.call(context, { dir: './policies' }, dependencies);

    expect(spawnMock).toHaveBeenCalledTimes(2);
    expect(spawnMock.mock.calls[1][1]).toEqual(['fmt', '--list', expect.any(String)]);
  });
});
