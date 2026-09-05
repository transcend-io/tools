/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'node:fs';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { deletePreferenceRecords, type DeletePreferenceRecordsCommandFlags } from '../impl.js';

const H = vi.hoisted(() => {
  // colors passthrough so assertions don’t include ANSI codes
  const colors = {
    green: (s: string) => s,
    yellow: (s: string) => s,
    magenta: (s: string) => s,
    cyan: (s: string) => s,
    red: (s: string) => s,
  };

  // Sombra GOT instance returned by factory
  const sombra = { tag: 'sombra' };

  // spies for preference-management exports
  const bulkDeletePreferenceRecords = vi.fn(); // we'll .mockImplementationOnce per test to drive streaming

  // // CSV helpers (new code path)
  const writeCsv = vi.fn();

  const reaDirSync = vi.fn((): string[] => []);

  return {
    colors,
    sombra,
    bulkDeletePreferenceRecords,
    writeCsv,
    reaDirSync,
  };
});

/* ----------------- Mocks (must be declared before importing SUT) ----------------- */
vi.mock('colors', () => ({
  __esModule: true,
  default: H.colors,
  ...H.colors,
}));

vi.mock('@transcend-io/sdk', () => ({
  // eslint-disable-next-line require-await
  createSombraGotInstance: vi.fn(async () => H.sombra),
}));

// New CSV helpers used by impl after your refactor
vi.mock('../../../../lib/helpers/index.js', () => ({
  writeCsv: H.writeCsv,
}));

// preference-management: forward and record args, then delegate to our spies
vi.mock('../../../../lib/preference-management/index.js', () => ({
  // eslint-disable-next-line require-await
  bulkDeletePreferenceRecords: async (sombra: unknown, opts: any) =>
    H.bulkDeletePreferenceRecords(sombra, opts),
}));

describe('deletePreferenceRecordsImpl', () => {
  const ctx = buildContextForTest({
    env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'false' },
    fs: {
      ...fs,
      readdirSync: H.reaDirSync as unknown as typeof fs.readdirSync,
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    ctx.reset();
  });

  it('runs input validation using the context process', async () => {
    const flags: DeletePreferenceRecordsCommandFlags = {
      auth: 'tok',
      partition: 'part-1',
      sombraAuth: 'sombra-tok',
      file: '/tmp/out.csv',
      transcendUrl: 'https://app.transcend.io',
      maxItemsInChunk: 1000,
      maxConcurrency: 90,
      timestamp: new Date(),
      receiptDirectory: '/tmp/receipts',
      fileConcurrency: 5,
    };

    await deletePreferenceRecords.call(ctx, flags);

    expect(ctx.exit).not.toHaveBeenCalled();
  });

  it('errors if both file and directory are provided', async () => {
    const flags: DeletePreferenceRecordsCommandFlags = {
      auth: 'tok',
      partition: 'part-1',
      sombraAuth: 'sombra-tok',
      file: '/tmp/out.csv',
      directory: '/tmp/dir',
      transcendUrl: 'https://app.transcend.io',
      maxItemsInChunk: 1000,
      maxConcurrency: 90,
      timestamp: new Date(),
      receiptDirectory: '/tmp/receipts',
      fileConcurrency: 5,
    };
    await expect(deletePreferenceRecords.call(ctx, flags)).rejects.toMatchObject({ code: 1 });
    expect(ctx.stderr).toContain(
      'Cannot provide both a directory and a file. Please provide only one.',
    );
    expect(ctx.exit).toHaveBeenCalledWith(1);
  });

  it('errors if neither file nor directory is provided', async () => {
    const flags: DeletePreferenceRecordsCommandFlags = {
      auth: 'tok',
      partition: 'part-1',
      sombraAuth: 'sombra-tok',
      transcendUrl: 'https://app.transcend.io',
      maxItemsInChunk: 1000,
      maxConcurrency: 90,
      timestamp: new Date(),
      receiptDirectory: '/tmp/receipts',
      fileConcurrency: 5,
    };
    await expect(deletePreferenceRecords.call(ctx, flags)).rejects.toMatchObject({ code: 1 });
    expect(ctx.stderr).toContain(
      'A file or directory must be provided. Please provide one using --file=./preferences.csv or --directory=./preferences',
    );
    expect(ctx.exit).toHaveBeenCalledWith(1);
  });

  it('errors if file is not a CSV', async () => {
    const flags: DeletePreferenceRecordsCommandFlags = {
      auth: 'tok',
      partition: 'part-1',
      sombraAuth: 'sombra-tok',
      file: '/tmp/out.txt',
      transcendUrl: 'https://app.transcend.io',
      maxItemsInChunk: 1000,
      maxConcurrency: 90,
      timestamp: new Date(),
      receiptDirectory: '/tmp/receipts',
      fileConcurrency: 5,
    };
    await expect(deletePreferenceRecords.call(ctx, flags)).rejects.toMatchObject({ code: 1 });
    expect(ctx.stderr).toContain('File must be a CSV file');
    expect(ctx.exit).toHaveBeenCalledWith(1);
  });

  it('errors if directory has no CSV files', async () => {
    H.reaDirSync.mockReturnValueOnce(['not-a-csv.txt']);
    const flags: DeletePreferenceRecordsCommandFlags = {
      auth: 'tok',
      partition: 'part-1',
      sombraAuth: 'sombra-tok',
      directory: '/tmp/dir',
      transcendUrl: 'https://app.transcend.io',
      maxItemsInChunk: 1000,
      maxConcurrency: 90,
      timestamp: new Date(),
      receiptDirectory: '/tmp/receipts',
      fileConcurrency: 5,
    };
    await expect(deletePreferenceRecords.call(ctx, flags)).rejects.toMatchObject({ code: 1 });
    expect(ctx.stderr).toContain('No CSV files found in directory: /tmp/dir');
    expect(ctx.exit).toHaveBeenCalledWith(1);
  });

  it('processes a single CSV file successfully', async () => {
    H.bulkDeletePreferenceRecords.mockResolvedValueOnce([]);
    const flags: DeletePreferenceRecordsCommandFlags = {
      auth: 'tok',
      partition: 'part-1',
      sombraAuth: 'sombra-tok',
      file: '/tmp/out.csv',
      transcendUrl: 'https://app.transcend.io',
      maxItemsInChunk: 1000,
      maxConcurrency: 90,
      timestamp: new Date(),
      receiptDirectory: '/tmp/receipts',
      fileConcurrency: 5,
    };
    await deletePreferenceRecords.call(ctx, flags);
    expect(H.bulkDeletePreferenceRecords).toHaveBeenCalledWith(
      H.sombra,
      expect.objectContaining({ filePath: '/tmp/out.csv' }),
    );
    expect(ctx.stdout).toContain('Deletion Summary Report');
    expect(H.writeCsv).not.toHaveBeenCalled();
  });

  it('processes multiple CSV files in a directory', async () => {
    // Mock readdirSync to return CSVs

    const flags: DeletePreferenceRecordsCommandFlags = {
      auth: 'tok',
      partition: 'part-1',
      sombraAuth: 'sombra-tok',
      directory: '/tmp/dir',
      transcendUrl: 'https://app.transcend.io',
      maxItemsInChunk: 1000,
      maxConcurrency: 90,
      timestamp: new Date(),
      receiptDirectory: '/tmp/receipts',
      fileConcurrency: 5,
    };
    H.reaDirSync.mockReturnValueOnce(['a.csv', 'b.csv', 'c.csv']);
    await deletePreferenceRecords.call(ctx, flags);
    expect(H.bulkDeletePreferenceRecords).toHaveBeenCalledTimes(3);
    expect(H.bulkDeletePreferenceRecords).toHaveBeenCalledWith(
      H.sombra,
      expect.objectContaining({ filePath: expect.stringContaining('a.csv') }),
    );
    expect(ctx.stdout).toContain('Deletion Summary Report');
  });

  it('writes a receipt if there are failed deletions', async () => {
    H.bulkDeletePreferenceRecords.mockResolvedValueOnce([{ id: 1, error: 'fail' }]);
    const flags: DeletePreferenceRecordsCommandFlags = {
      auth: 'tok',
      partition: 'part-1',
      sombraAuth: 'sombra-tok',
      file: '/tmp/out.csv',
      transcendUrl: 'https://app.transcend.io',
      maxItemsInChunk: 1000,
      maxConcurrency: 90,
      timestamp: new Date(),
      receiptDirectory: '/tmp/receipts',
      fileConcurrency: 5,
    };
    await deletePreferenceRecords.call(ctx, flags);
    expect(H.writeCsv).toHaveBeenCalledWith(
      expect.stringContaining('/tmp/receipts/deletion-failures-'),
      [{ id: 1, error: 'fail' }],
      true,
    );
    expect(ctx.stdout).toContain('Receipt Path:');
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any */
