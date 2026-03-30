/**
 * Integration tests for runPool — spawns real child processes.
 * These verify the full pipeline: spawn workers, assign tasks, collect results.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { runPool } from '../runPool.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const WORKER_PATH = join(__dirname, 'fixtures', 'echoWorker.ts');

let tmpBase: string;

describe('runPool integration', () => {
  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'runPool-test-'));
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  it('spawns workers, assigns tasks, collects results, and writes output files', async () => {
    const outputDir = join(tmpBase, 'output');
    mkdirSync(outputDir, { recursive: true });

    const files = ['a.csv', 'b.csv', 'c.csv'];
    const queue = [...files];
    let completed = 0;

    await runPool({
      title: 'Test Pool',
      baseDir: tmpBase,
      childModulePath: WORKER_PATH,
      childFlag: '--worker',
      poolSize: 2,
      cpuCount: 2,
      filesTotal: files.length,
      viewerMode: true,
      renderIntervalMs: 50,
      pollIntervalMs: 50,
      render: () => {},
      hooks: {
        nextTask: () => {
          const file = queue.shift();
          return file ? { file, outputDir } : undefined;
        },
        taskLabel: (t) => t.file,
        onProgress: (totals) => totals,
        onResult: (totals, res) => {
          if (res.ok) completed += 1;
          return { totals, ok: !!res.ok };
        },
      },
    });

    expect(completed).toBe(3);

    for (const file of files) {
      const outPath = join(outputDir, `processed-${file}`);
      expect(existsSync(outPath)).toBe(true);
      expect(readFileSync(outPath, 'utf8')).toBe(`done:${file}`);
    }
  }, 15_000);

  it('creates log directory with expected worker log files', async () => {
    const queue = [{ file: 'x.csv', outputDir: tmpBase }];

    await runPool({
      title: 'Log Test',
      baseDir: tmpBase,
      childModulePath: WORKER_PATH,
      childFlag: '--worker',
      poolSize: 1,
      cpuCount: 1,
      filesTotal: 1,
      viewerMode: true,
      renderIntervalMs: 50,
      pollIntervalMs: 50,
      render: () => {},
      hooks: {
        nextTask: () => queue.shift(),
        taskLabel: (t) => t.file,
        onProgress: (totals) => totals,
        onResult: (totals) => ({ totals, ok: true }),
      },
    });

    const logDir = join(tmpBase, 'logs');
    expect(existsSync(logDir)).toBe(true);

    const logFiles = readdirSync(logDir);
    expect(logFiles).toContain('worker-0.log');
    expect(logFiles).toContain('worker-0.out.log');
    expect(logFiles).toContain('worker-0.err.log');
    expect(logFiles).toContain('worker-0.info.log');
    expect(logFiles).toContain('worker-0.warn.log');
    expect(logFiles).toContain('worker-0.error.log');
  }, 15_000);

  it('handles empty task queue gracefully (zero tasks)', async () => {
    let renderCount = 0;

    await runPool({
      title: 'Empty Pool',
      baseDir: tmpBase,
      childModulePath: WORKER_PATH,
      childFlag: '--worker',
      poolSize: 2,
      cpuCount: 2,
      filesTotal: 0,
      viewerMode: true,
      renderIntervalMs: 50,
      pollIntervalMs: 50,
      render: () => {
        renderCount += 1;
      },
      hooks: {
        nextTask: () => undefined,
        taskLabel: () => '',
        onProgress: (totals) => totals,
        onResult: (totals) => ({ totals, ok: true }),
      },
    });

    expect(renderCount).toBeGreaterThan(0);
  }, 15_000);

  it('propagates postProcess errors', async () => {
    const queue = [{ file: 'x.csv', outputDir: tmpBase }];

    await expect(
      runPool({
        title: 'PostProcess Error',
        baseDir: tmpBase,
        childModulePath: WORKER_PATH,
        childFlag: '--worker',
        poolSize: 1,
        cpuCount: 1,
        filesTotal: 1,
        viewerMode: true,
        renderIntervalMs: 50,
        pollIntervalMs: 50,
        render: () => {},
        hooks: {
          nextTask: () => queue.shift(),
          taskLabel: (t) => t.file,
          onProgress: (totals) => totals,
          onResult: (totals) => ({ totals, ok: true }),
          postProcess: () => {
            throw new Error('postProcess boom');
          },
        },
      }),
    ).rejects.toThrow('postProcess boom');
  }, 15_000);

  it('uses resetMode=delete to clean old log files', async () => {
    const logDir = join(tmpBase, 'logs');
    mkdirSync(logDir, { recursive: true });

    const queue = [{ file: 'x.csv', outputDir: tmpBase }];

    await runPool({
      title: 'Reset Delete',
      baseDir: tmpBase,
      childModulePath: WORKER_PATH,
      childFlag: '--worker',
      poolSize: 1,
      cpuCount: 1,
      filesTotal: 1,
      viewerMode: true,
      resetMode: 'delete',
      renderIntervalMs: 50,
      pollIntervalMs: 50,
      render: () => {},
      hooks: {
        nextTask: () => queue.shift(),
        taskLabel: (t) => t.file,
        onProgress: (totals) => totals,
        onResult: (totals) => ({ totals, ok: true }),
      },
    });

    const logFiles = readdirSync(logDir);
    expect(logFiles).toContain('worker-0.log');
  }, 15_000);
});
