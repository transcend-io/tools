import fs from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { _eval } from '../impl.js';

const assertOpaInstalledMock = vi.hoisted(() => vi.fn());
const runOpaMock = vi.hoisted(() => vi.fn().mockResolvedValue(0));

vi.mock('../../helpers/index.js', () => ({
  assertOpaInstalled: assertOpaInstalledMock,
  runOpa: runOpaMock,
}));

describe('policy eval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to the shared local policy project', async () => {
    const context = buildContextForTest({
      cwd: '/repo',
      fs: { ...fs, existsSync: vi.fn(() => true) },
    });

    await _eval.call(context, {
      pkg: 'data.transcend.decision',
      input: './input.json',
    });

    expect(assertOpaInstalledMock).toHaveBeenCalledOnce();
    expect(runOpaMock).toHaveBeenCalledWith([
      'eval',
      '--format',
      'pretty',
      '--input',
      '/repo/input.json',
      '-b',
      '/repo/transcend/policy',
      'data.transcend.decision',
    ]);
  });

  it('resolves a positional directory from the invocation directory', async () => {
    const context = buildContextForTest({
      cwd: '/repo',
      fs: { ...fs, existsSync: vi.fn(() => true) },
    });

    await _eval.call(
      context,
      {
        pkg: 'data.transcend.decision',
        input: './input.json',
      },
      './policies',
    );

    expect(runOpaMock).toHaveBeenCalledWith(expect.arrayContaining(['-b', '/repo/policies']));
  });
});
