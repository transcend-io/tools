import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { test } from '../impl.js';

const assertOpaInstalledMock = vi.hoisted(() => vi.fn());
const runOpaMock = vi.hoisted(() => vi.fn().mockResolvedValue(0));

vi.mock('../../helpers/index.js', () => ({
  assertOpaInstalled: assertOpaInstalledMock,
  runOpa: runOpaMock,
}));

describe('policy test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to the shared local policy project', async () => {
    const context = buildContextForTest({ cwd: '/repo' });

    await test.call(context, {});

    expect(assertOpaInstalledMock).toHaveBeenCalledOnce();
    expect(runOpaMock).toHaveBeenCalledWith(['test', '/repo/transcend/policy']);
  });

  it('resolves a positional directory from the invocation directory', async () => {
    const context = buildContextForTest({ cwd: '/repo' });

    await test.call(context, {}, './policies');

    expect(runOpaMock).toHaveBeenCalledWith(['test', '/repo/policies']);
  });
});
