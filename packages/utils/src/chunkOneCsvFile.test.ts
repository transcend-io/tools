import { mkdtemp, writeFile, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join as pathJoin } from 'node:path';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { chunkOneCsvFile } from './chunkOneCsvFile.js';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('chunkOneCsvFile (async, streaming)', () => {
  it('splits into multiple padded chunk files and preserves headers/rows', async () => {
    const work = await mkdtemp(pathJoin(tmpdir(), 'chunk-csv-'));

    const inputCsv = [
      'colA,colB,colC',
      'xxxxxxxxxx,xxxxxxxxxx,xxxxxxxxxx',
      'xxxxxxxxxx,xxxxxxxxxx,xxxxxxxxxx',
      'xxxxxxxxxx,xxxxxxxxxx,xxxxxxxxxx',
    ].join('\n');

    const inPath = pathJoin(work, 'sample.csv');
    await writeFile(inPath, inputCsv, 'utf8');

    const onProgress = vi.fn();
    const loggerSpy = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    await chunkOneCsvFile({
      filePath: inPath,
      outputDir: work,
      clearOutputDir: true,
      chunkSizeMB: 0.00007,
      onProgress,
      logger: loggerSpy,
    });

    const files = (await readdir(work)).sort();
    const chunk1 = pathJoin(work, 'sample_chunk_0001.csv');
    const chunk2 = pathJoin(work, 'sample_chunk_0002.csv');

    expect(files).toContain('sample_chunk_0001.csv');
    expect(files).toContain('sample_chunk_0002.csv');

    const c1 = await readFile(chunk1, 'utf8');
    const c2 = await readFile(chunk2, 'utf8');

    const c1Lines = c1.trim().split('\n');
    const c2Lines = c2.trim().split('\n');

    expect(c1Lines[0]).toBe('colA,colB,colC');
    expect(c2Lines[0]).toBe('colA,colB,colC');

    expect(c1Lines.length).toBe(1 + 2);
    expect(c2Lines.length).toBe(1 + 1);

    expect(onProgress).toHaveBeenCalled();
    const last = onProgress.mock.calls.at(-1);
    expect(last?.[0]).toBe(3);

    expect(loggerSpy.info).toHaveBeenCalledWith(expect.stringContaining('Chunked '));

    await rm(work, { recursive: true, force: true });
  });
});
