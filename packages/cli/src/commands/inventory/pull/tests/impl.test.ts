import type fs from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { pull, type PullCommandFlags } from '../impl.js';

const pullTranscendConfigurationMock = vi.hoisted(() => vi.fn());

vi.mock('@transcend-io/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@transcend-io/sdk')>();
  return {
    ...actual,
    buildTranscendGraphQLClient: vi.fn(() => ({})),
    pullTranscendConfiguration: pullTranscendConfigurationMock,
  };
});

const FILE = './transcend.yml';

const flags = (overrides: Partial<PullCommandFlags> = {}): PullCommandFlags => ({
  auth: 'api-key',
  file: FILE,
  transcendUrl: 'https://api.transcend.io',
  pageSize: 50,
  skipDatapoints: false,
  skipSubDatapoints: false,
  includeGuessedCategories: false,
  debug: false,
  dryRun: false,
  ...overrides,
});

describe('inventory pull', () => {
  const writeFileSync = vi.fn();
  const readFileSync = vi.fn();
  const existsSync = vi.fn<(path: string) => boolean>();
  const testFs = { existsSync, readFileSync, writeFileSync } as unknown as typeof fs;

  beforeEach(() => {
    vi.clearAllMocks();
    existsSync.mockImplementation((path) => path === FILE);
    readFileSync.mockReturnValue('vendors:\n  - title: Old\n');
    pullTranscendConfigurationMock.mockResolvedValue({ vendors: [{ title: 'New' }] });
  });

  it('writes the file by default', async () => {
    const context = buildContextForTest({ fs: testFs });
    await pull.call(context, flags());

    expect(writeFileSync).toHaveBeenCalledWith(FILE, 'vendors:\n  - title: New\n');
  });

  it('--dryRun prints a diff and does not write', async () => {
    const context = buildContextForTest({ fs: testFs });
    await pull.call(context, flags({ dryRun: true }));

    expect(writeFileSync).not.toHaveBeenCalled();
    expect(context.stdout).toContain('-  - title: Old');
    expect(context.stdout).toContain('+  - title: New');
    expect(context.stdout).toContain('Nothing was written');
  });

  it('--dryRun reports no changes when the file already matches', async () => {
    readFileSync.mockReturnValue('vendors:\n  - title: New\n');
    const context = buildContextForTest({ fs: testFs });
    await pull.call(context, flags({ dryRun: true }));

    expect(writeFileSync).not.toHaveBeenCalled();
    expect(context.stdout).toContain('No changes to "./transcend.yml".');
  });

  it('--dryRun treats a missing file as empty', async () => {
    existsSync.mockReturnValue(false);
    const context = buildContextForTest({ fs: testFs });
    await pull.call(context, flags({ dryRun: true }));

    expect(readFileSync).not.toHaveBeenCalled();
    expect(context.stdout).toContain('+  - title: New');
  });
});
