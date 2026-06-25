import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { LocalContext } from '../../../../context.js';
import { lint } from '../impl.js';

const runOpaMock = vi.hoisted(() => vi.fn());
const assertOpaInstalledMock = vi.hoisted(() => vi.fn());

vi.mock('../../_helpers.js', () => ({
  assertOpaInstalled: assertOpaInstalledMock,
  runOpa: runOpaMock,
}));

describe('lint', () => {
  const exit = vi.fn();
  const context = {
    process: { exit, stdout: { write: vi.fn() } },
  } as unknown as LocalContext;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEVELOPMENT_MODE_VALIDATE_ONLY = 'false';
  });

  it('runs opa check and fmt, exiting on check failure', async () => {
    runOpaMock.mockResolvedValueOnce(2);

    await lint.call(context, { dir: './policies' });

    expect(assertOpaInstalledMock).toHaveBeenCalled();
    expect(runOpaMock).toHaveBeenCalledWith(['check', '--strict', expect.any(String)]);
    expect(exit).toHaveBeenCalledWith(2);
  });

  it('exits when fmt --diff finds formatting issues', async () => {
    runOpaMock.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    await lint.call(context, { dir: './policies' });

    expect(runOpaMock).toHaveBeenNthCalledWith(2, ['fmt', '--diff', expect.any(String)]);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
