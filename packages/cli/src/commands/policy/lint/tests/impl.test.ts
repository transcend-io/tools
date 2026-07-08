import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { LocalContext } from '../../../../context.js';
import { lint } from '../impl.js';

const runOpaMock = vi.hoisted(() => vi.fn());
const runOPACaptureMock = vi.hoisted(() => vi.fn());
const assertOpaInstalledMock = vi.hoisted(() => vi.fn());
const inquirerConfirmBooleanMock = vi.hoisted(() => vi.fn());

vi.mock('../../helpers/index.js', () => ({
  assertOpaInstalled: assertOpaInstalledMock,
  runOpa: runOpaMock,
  runOPACapture: runOPACaptureMock,
}));

vi.mock('../../../../lib/helpers/inquirer.js', () => ({
  inquirerConfirmBoolean: inquirerConfirmBooleanMock,
}));

describe('lint', () => {
  const exit = vi.fn();
  const context = {
    process: {
      exit,
      stdout: { write: vi.fn() },
      stdin: { isTTY: true },
    },
  } as unknown as LocalContext;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEVELOPMENT_MODE_VALIDATE_ONLY = 'false';
    exit.mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`exit:${code}`);
    });
  });

  it('runs opa check and fmt, exiting on check failure', async () => {
    runOpaMock.mockResolvedValueOnce(2);

    await expect(lint.call(context, { dir: './policies' })).rejects.toThrow('exit:2');

    expect(assertOpaInstalledMock).toHaveBeenCalled();
    expect(runOpaMock).toHaveBeenCalledWith(['check', '--strict', expect.any(String)]);
    expect(runOPACaptureMock).not.toHaveBeenCalled();
  });

  it('exits when the user declines formatting unformatted files', async () => {
    runOpaMock.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    runOPACaptureMock.mockResolvedValueOnce({
      code: 0,
      stdout: '/tmp/policies/policy.rego\n',
      stderr: '',
    });
    inquirerConfirmBooleanMock.mockResolvedValueOnce(false);

    await expect(lint.call(context, { dir: './policies' })).rejects.toThrow('exit:1');

    expect(runOPACaptureMock).toHaveBeenCalledWith(['fmt', '--list', expect.any(String)]);
    expect(runOpaMock).toHaveBeenNthCalledWith(2, ['fmt', '--diff', expect.any(String)]);
    expect(inquirerConfirmBooleanMock).toHaveBeenCalledWith({
      message: 'Format the unformatted policy files listed above?',
    });
    expect(runOpaMock).not.toHaveBeenCalledWith(['fmt', '-w', expect.any(String)]);
  });

  it('formats unformatted files when the user confirms', async () => {
    runOpaMock.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    runOPACaptureMock.mockResolvedValueOnce({
      code: 0,
      stdout: '/tmp/policies/policy.rego\n',
      stderr: '',
    });
    inquirerConfirmBooleanMock.mockResolvedValueOnce(true);

    await lint.call(context, { dir: './policies' });

    expect(runOpaMock).toHaveBeenNthCalledWith(3, ['fmt', '-w', expect.any(String)]);
    expect(exit).not.toHaveBeenCalled();
  });

  it('exits without prompting in a non-interactive environment', async () => {
    const nonInteractiveContext = {
      process: {
        exit,
        stdout: { write: vi.fn() },
        stdin: { isTTY: false },
      },
    } as unknown as LocalContext;

    runOpaMock.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    runOPACaptureMock.mockResolvedValueOnce({
      code: 0,
      stdout: '/tmp/policies/policy.rego\n',
      stderr: '',
    });

    await expect(lint.call(nonInteractiveContext, { dir: './policies' })).rejects.toThrow('exit:1');

    expect(inquirerConfirmBooleanMock).not.toHaveBeenCalled();
    expect(runOpaMock).not.toHaveBeenCalledWith(['fmt', '-w', expect.any(String)]);
  });

  it('passes when all files are formatted', async () => {
    runOpaMock.mockResolvedValueOnce(0);
    runOPACaptureMock.mockResolvedValueOnce({
      code: 0,
      stdout: '',
      stderr: '',
    });

    await lint.call(context, { dir: './policies' });

    expect(runOpaMock).toHaveBeenCalledTimes(1);
    expect(runOPACaptureMock).toHaveBeenCalledWith(['fmt', '--list', expect.any(String)]);
  });
});
