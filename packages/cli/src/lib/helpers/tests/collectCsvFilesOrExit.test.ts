import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join as pathJoin } from 'node:path';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { buildContextForTest } from '../../tests/helpers/buildContextForTest.js';
import { collectCsvFilesOrExit } from '../collectCsvFilesOrExit.js';

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

describe('collectCsvFilesOrExit', () => {
  it('exits when directory is undefined', () => {
    expect(() => collectCsvFilesOrExit(undefined, ctx)).toThrowError(/Process exited with code 1/);

    expect(ctx.stderr).toContain('--directory must be provided');
    expect(ctx.exit).toHaveBeenCalledWith(1);
  });

  it('exits when readdirSync throws (cannot read directory)', () => {
    mReadDir.mockImplementation(() => {
      throw new Error('boom');
    });

    expect(() => collectCsvFilesOrExit('/data/in', ctx)).toThrowError(/Process exited with code 1/);

    expect(ctx.stderr).toContain('Failed to read directory: /data/in');
    expect(ctx.stderr).toContain('boom');
    expect(ctx.exit).toHaveBeenCalledWith(1);
  });

  it('exits when no CSV files are found', () => {
    mReadDir.mockReturnValue(['notes.txt', 'image.png']);
    mStat.mockReturnValue({ isFile: () => true });

    expect(() => collectCsvFilesOrExit('/dir', ctx)).toThrowError(/Process exited with code 1/);

    expect(ctx.stderr).toContain('No CSV files found in directory: /dir');
    expect(ctx.exit).toHaveBeenCalledWith(1);
  });

  it('returns only CSV files that are real files', () => {
    mReadDir.mockReturnValue(['a.csv', 'b.txt', 'c.csv']);
    mStat.mockImplementation((p) => {
      const isFile = p === pathJoin('/data', 'a.csv') || p === pathJoin('/data', 'c.csv');
      return { isFile: () => isFile };
    });

    const out = collectCsvFilesOrExit('/data', ctx);

    expect(out).toEqual([pathJoin('/data', 'a.csv'), pathJoin('/data', 'c.csv')]);
    expect(ctx.exit).not.toHaveBeenCalled();
    expect(ctx.stderr).toBe('');
  });

  it('filters out CSV entries whose statSync throws (e.g., broken symlink)', () => {
    mReadDir.mockReturnValue(['good.csv', 'bad.csv', 'skip.txt']);
    mStat.mockImplementation((p) => {
      if (p === pathJoin('/x', 'bad.csv')) throw new Error('ENOENT');
      return { isFile: () => true };
    });

    const out = collectCsvFilesOrExit('/x', ctx);

    expect(out).toEqual([pathJoin('/x', 'good.csv')]);
    expect(ctx.exit).not.toHaveBeenCalled();
  });

  it('ignores CSVs that are directories (isFile() === false)', () => {
    mReadDir.mockReturnValue(['dirlike.csv', 'real.csv']);
    mStat.mockImplementation((p) => {
      if (p === pathJoin('/root', 'dirlike.csv')) {
        return { isFile: () => false };
      }
      return { isFile: () => true };
    });

    const out = collectCsvFilesOrExit('/root', ctx);

    expect(out).toEqual([pathJoin('/root', 'real.csv')]);
    expect(ctx.process.exit).not.toHaveBeenCalled();
  });

  it('accepts a legacy process-only context', () => {
    const directory = fs.mkdtempSync(pathJoin(tmpdir(), 'collect-csv-'));
    const file = pathJoin(directory, 'input.csv');
    fs.writeFileSync(file, 'id\n1\n');

    try {
      expect(collectCsvFilesOrExit(directory, { process: ctx.process })).toEqual([file]);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
