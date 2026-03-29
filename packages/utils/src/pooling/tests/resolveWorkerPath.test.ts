import { writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { resolveWorkerPath } from '../resolveWorkerPath.js';

let tmpBase: string;

describe('resolveWorkerPath', () => {
  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'resolveWorker-'));
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  it('returns sibling worker.js when it exists (source mode)', () => {
    // Simulate source layout: impl.ts and worker.js are siblings
    const workerPath = join(tmpBase, 'worker.js');
    writeFileSync(workerPath, 'export default {}');

    const callerUrl = pathToFileURL(join(tmpBase, 'impl.ts')).href;
    const result = resolveWorkerPath(callerUrl, 'commands/admin/chunk-csv/worker.mjs');

    expect(result).toBe(workerPath);
  });

  it('falls back to dist path when sibling worker.js does not exist', () => {
    // Simulate dist layout: impl is in dist/ root, no sibling worker.js
    const callerUrl = pathToFileURL(join(tmpBase, 'impl-HASH.mjs')).href;
    const result = resolveWorkerPath(callerUrl, 'commands/admin/chunk-csv/worker.mjs');

    expect(result).toBe(join(tmpBase, 'commands', 'admin', 'chunk-csv', 'worker.mjs'));
  });

  it('resolves different dist paths for different commands', () => {
    const callerUrl = pathToFileURL(join(tmpBase, 'impl.mjs')).href;

    const chunkResult = resolveWorkerPath(callerUrl, 'commands/admin/chunk-csv/worker.mjs');
    const parquetResult = resolveWorkerPath(callerUrl, 'commands/admin/parquet-to-csv/worker.mjs');

    expect(chunkResult).toContain('chunk-csv');
    expect(parquetResult).toContain('parquet-to-csv');
    expect(chunkResult).not.toBe(parquetResult);
  });

  it('prefers sibling even when dist path also exists', () => {
    const workerPath = join(tmpBase, 'worker.js');
    writeFileSync(workerPath, 'export default {}');

    const distDir = join(tmpBase, 'commands', 'admin', 'chunk-csv');
    mkdirSync(distDir, { recursive: true });
    writeFileSync(join(distDir, 'worker.mjs'), 'export default {}');

    const callerUrl = pathToFileURL(join(tmpBase, 'impl.ts')).href;
    const result = resolveWorkerPath(callerUrl, 'commands/admin/chunk-csv/worker.mjs');

    expect(result).toBe(workerPath);
  });
});
