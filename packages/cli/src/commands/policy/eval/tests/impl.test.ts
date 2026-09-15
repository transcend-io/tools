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

  it('requires an explicit bundle directory and forwards curated opa eval flags', async () => {
    const context = buildContextForTest({
      cwd: '/repo',
      fs: { ...fs, existsSync: vi.fn(() => true) },
    });

    await _eval.call(
      context,
      {
        package: 'data.transcend.decision',
        input: './input.json',
        format: 'json',
        schema: './schemas',
        explain: 'notes',
      },
      'transcend/policy/payments',
    );

    expect(assertOpaInstalledMock).toHaveBeenCalledOnce();
    expect(runOpaMock).toHaveBeenCalledWith([
      'eval',
      '--format',
      'json',
      '--input',
      '/repo/input.json',
      '-b',
      '/repo/transcend/policy/payments',
      '--schema',
      '/repo/schemas',
      '--explain',
      'notes',
      'data.transcend.decision',
    ]);
  });
});
