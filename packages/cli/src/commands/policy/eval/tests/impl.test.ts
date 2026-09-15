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
        'stdin-input': false,
        format: 'json',
        schema: './schemas',
        explain: 'notes',
        metrics: true,
        instrument: true,
        profile: true,
        timeout: '5s',
        'var-values': true,
        'show-builtin-errors': true,
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
      '--metrics',
      '--instrument',
      '--profile',
      '--timeout',
      '5s',
      '--var-values',
      '--show-builtin-errors',
      'data.transcend.decision',
    ]);
  });

  it('forwards --stdin-input when no --input path is provided', async () => {
    const context = buildContextForTest({
      cwd: '/repo',
      fs: { ...fs, existsSync: vi.fn(() => true) },
    });

    await _eval.call(
      context,
      {
        package: 'data.example.result',
        'stdin-input': true,
        format: 'pretty',
        metrics: false,
        instrument: false,
        profile: false,
        'var-values': false,
        'show-builtin-errors': false,
      },
      'transcend/policy/example-bundle',
    );

    expect(runOpaMock).toHaveBeenCalledWith([
      'eval',
      '--format',
      'pretty',
      '--stdin-input',
      '-b',
      '/repo/transcend/policy/example-bundle',
      'data.example.result',
    ]);
  });

  it('rejects providing both --input and --stdin-input', async () => {
    const context = buildContextForTest({ cwd: '/repo' });

    await expect(
      _eval.call(
        context,
        {
          package: 'data.example.result',
          input: './input.json',
          'stdin-input': true,
          format: 'pretty',
          metrics: false,
          instrument: false,
          profile: false,
          'var-values': false,
          'show-builtin-errors': false,
        },
        'transcend/policy/example-bundle',
      ),
    ).rejects.toThrow('Pass either --input or --stdin-input, not both.');
  });

  it('requires --input or --stdin-input', async () => {
    const context = buildContextForTest({ cwd: '/repo' });

    await expect(
      _eval.call(
        context,
        {
          package: 'data.example.result',
          'stdin-input': false,
          format: 'pretty',
          metrics: false,
          instrument: false,
          profile: false,
          'var-values': false,
          'show-builtin-errors': false,
        },
        'transcend/policy/example-bundle',
      ),
    ).rejects.toThrow('Provide an input document with --input <path> or --stdin-input.');
  });
});
