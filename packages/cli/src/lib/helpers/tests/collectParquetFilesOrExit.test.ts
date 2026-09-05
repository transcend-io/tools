import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join as pathJoin } from 'node:path';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { buildContextForTest } from '../../tests/helpers/buildContextForTest.js';
import { collectParquetFilesOrExit } from '../collectParquetFilesOrExit.js';

const mReadDir = vi.fn();
const mStat = vi.fn();
const ctx = buildContextForTest({
  fs: {
    ...fs,
    readdirSync: mReadDir,
    statSync: mStat,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  ctx.reset();
});

describe('collectParquetFilesOrExit', () => {
  it('exits when directory is undefined', () => {
    expect(() => collectParquetFilesOrExit(undefined, ctx)).toThrowError(
      /Process exited with code 1/,
    );

    expect(ctx.stderr).toContain('--directory must be provided');
    expect(ctx.exit).toHaveBeenCalledWith(1);
  });

  it('exits when readdirSync throws (cannot read directory)', () => {
    mReadDir.mockImplementation(() => {
      throw new Error('boom');
    });

    expect(() => collectParquetFilesOrExit('/data/in', ctx)).toThrowError(
      /Process exited with code 1/,
    );

    expect(ctx.stderr).toContain('Failed to read directory: /data/in');
    expect(ctx.stderr).toContain('boom');
    expect(ctx.exit).toHaveBeenCalledWith(1);
  });

  it('exits when no Parquet files are found', () => {
    mReadDir.mockReturnValue(['notes.txt', 'image.png']);
    mStat.mockReturnValue({ isFile: () => true });

    expect(() => collectParquetFilesOrExit('/dir', ctx)).toThrowError(/Process exited with code 1/);

    expect(ctx.stderr).toContain('No Parquet files found in directory: /dir');
    expect(ctx.exit).toHaveBeenCalledWith(1);
  });

  it('returns only .parquet files that are real files', () => {
    mReadDir.mockReturnValue(['a.parquet', 'b.txt', 'c.parquet']);
    mStat.mockImplementation((p) => {
      const isFile = p === pathJoin('/data', 'a.parquet') || p === pathJoin('/data', 'c.parquet');
      return { isFile: () => isFile };
    });

    const out = collectParquetFilesOrExit('/data', ctx);

    expect(out).toEqual([pathJoin('/data', 'a.parquet'), pathJoin('/data', 'c.parquet')]);
    expect(ctx.exit).not.toHaveBeenCalled();
    expect(ctx.stderr).toBe('');
  });

  it('filters out .parquet entries whose statSync throws (e.g., broken symlink)', () => {
    mReadDir.mockReturnValue(['good.parquet', 'bad.parquet', 'skip.txt']);
    mStat.mockImplementation((p) => {
      if (p === pathJoin('/x', 'bad.parquet')) throw new Error('ENOENT');
      return { isFile: () => true };
    });

    const out = collectParquetFilesOrExit('/x', ctx);

    expect(out).toEqual([pathJoin('/x', 'good.parquet')]);
    expect(ctx.exit).not.toHaveBeenCalled();
  });

  it('ignores .parquet entries that are directories (isFile() === false)', () => {
    mReadDir.mockReturnValue(['dirlike.parquet', 'real.parquet']);
    mStat.mockImplementation((p) => {
      if (p === pathJoin('/root', 'dirlike.parquet')) {
        return { isFile: () => false };
      }
      return { isFile: () => true };
    });

    const out = collectParquetFilesOrExit('/root', ctx);

    expect(out).toEqual([pathJoin('/root', 'real.parquet')]);
    expect(ctx.process.exit).not.toHaveBeenCalled();
  });

  it('accepts a legacy process-only context', () => {
    const directory = fs.mkdtempSync(pathJoin(tmpdir(), 'collect-parquet-'));
    const file = pathJoin(directory, 'input.parquet');
    fs.writeFileSync(file, '');

    try {
      expect(collectParquetFilesOrExit(directory, { process: ctx.process })).toEqual([file]);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
