import { PoolHooks } from '@transcend-io/utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { chunkCsv, type ChunkCsvCommandFlags } from '../impl.js';
// ⬇️ SUT imports AFTER mocks
import { chunkCsvPlugin } from '../ui/index.js';
import type { ChunkProgress, ChunkResult, ChunkTask } from '../worker.js';

const H = vi.hoisted(() => {
  const files = ['/abs/a.csv', '/abs/b.csv', '/abs/c.csv'];

  // capture the last runPool args so tests can assert hooks later
  const lastRunPoolArgs: {
    title?: string;
    baseDir?: string;
    childFlag?: string;
    childModulePath?: string;
    poolSize?: number;
    cpuCount?: number;
    filesTotal?: number;
    hooks?: PoolHooks<ChunkTask, ChunkProgress, ChunkResult, Record<string, never>>;
    viewerMode?: boolean;
    render?: (input: unknown) => unknown;
    installInteractiveSwitcher?: (args: {
      /** Worker registry. */
      workers: Map<number, never>;
      /** Graceful shutdown callback. */
      onCtrlC: () => void;
      /** Resolve worker log paths. */
      getLogPaths: (id: number) => undefined;
      /** Number of bytes to replay. */
      replayBytes: number;
      /** Log streams to replay. */
      replayWhich: ('out' | 'err')[];
      /** Pause dashboard rendering. */
      setPaused: (p: boolean) => void;
      /** Repaint the dashboard. */
      repaint: () => void;
    }) => unknown;
    extraKeyHandler?: (args: {
      logsBySlot: Map<number, string[]>;
      repaint: () => void;
      setPaused: (p: boolean) => void;
    }) => unknown;
  } = {};

  const pooling = {
    CHILD_FLAG: '--child',
    computePoolSize: vi.fn(() => ({
      poolSize: 7,
      cpuCount: 10,
    })),
    // runPool will just record its args for later inspection
    runPool: vi.fn(async (args: typeof lastRunPoolArgs): Promise<void> => {
      Object.assign(lastRunPoolArgs, args);
    }),
    render: vi.fn(),
    installInteractiveSwitcher: vi.fn(),
    extraKeyHandler: vi.fn(),
    createPoolingCommandUi: vi.fn(() => ({
      render: pooling.render,
      installInteractiveSwitcher: pooling.installInteractiveSwitcher,
      extraKeyHandler: pooling.extraKeyHandler,
    })),
  };

  const helpers = {
    collectCsvFilesOrExit: vi.fn(() => files.slice()),
  };

  // colors.* passthrough so assertions don’t deal with ANSI codes
  const colors = {
    green: (s: string) => s,
    dim: (s: string) => s,
    bold: (s: string) => s,
    cyan: (s: string) => s,
    red: (s: string) => s,
    yellow: (s: string) => s,
  };

  return { files, pooling, helpers, colors, lastRunPoolArgs };
});

// --- Module mocks (MUST be before importing the SUT) ---------------------------------------------
// single colors mock with default export (SUT does `import colors from 'colors'`)
vi.mock('colors', () => ({
  __esModule: true,
  default: H.colors,
  ...H.colors, // if any code uses named imports style
}));

vi.mock('../../../../lib/helpers/collectCsvFilesOrExit.js', () => ({
  collectCsvFilesOrExit: H.helpers.collectCsvFilesOrExit,
}));

/**
 * IMPORTANT: mock the exact module id after resolution. Using the absolute path
 * to the actual file from *this test file* is reliable for Vitest.
 */
vi.mock('@transcend-io/utils', async () => {
  const actual = await vi.importActual<typeof import('@transcend-io/utils')>('@transcend-io/utils');
  return {
    ...actual,
    CHILD_FLAG: H.pooling.CHILD_FLAG,
    computePoolSize: H.pooling.computePoolSize,
    runPool: H.pooling.runPool,
  };
});

vi.mock('../../../../lib/pooling/index.js', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../lib/pooling/index.js')>(
      '../../../../lib/pooling',
    );
  return {
    ...actual,
    createPoolingCommandUi: H.pooling.createPoolingCommandUi,
  };
});

// -------------------------------------------------------------------------------------------------

describe('chunkCsv', () => {
  const ctx = buildContextForTest({
    cwd: '/test/cwd',
    env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'false' },
  });

  const baseFlags: ChunkCsvCommandFlags = {
    directory: '/abs',
    outputDir: '/out',
    clearOutputDir: true,
    chunkSizeMB: 100,
    concurrency: undefined,
    viewerMode: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ctx.reset();
  });

  afterEach(() => {
    // ensure CHILD_FLAG branch didn’t accidentally run
    expect(ctx.process.argv.includes(H.pooling.CHILD_FLAG)).toBe(false);
  });

  it('discovers files, sizes the pool, logs, builds queue, and invokes runPool with expected args', async () => {
    await chunkCsv.call(ctx, baseFlags);

    expect(H.helpers.collectCsvFilesOrExit).toHaveBeenCalledWith(baseFlags.directory, ctx);

    // pool sizing called with concurrency + number of files
    expect(H.pooling.computePoolSize).toHaveBeenCalledWith(undefined, H.files.length);

    // info log includes file count and pool size text (unstyled)
    expect(ctx.stdout).toContain(`Chunking ${H.files.length} CSV file(s)`);
    expect(ctx.stdout).toContain('pool size 7');
    expect(ctx.stdout).toContain('CPU=10');

    // runPool called once
    expect(H.pooling.runPool).toHaveBeenCalledTimes(1);

    const a = H.lastRunPoolArgs;
    expect(a.title).toBe('Chunk CSV - /abs');
    // baseDir prefers directory (present)
    expect(a.baseDir).toBe(baseFlags.directory);
    expect(a.childFlag).toBe(H.pooling.CHILD_FLAG);
    expect(typeof a.childModulePath).toBe('string'); // env-dependent
    expect(a.poolSize).toBe(7);
    expect(a.cpuCount).toBe(10);
    expect(a.filesTotal).toBe(H.files.length);
    expect(a.viewerMode).toBe(true);
    expect(typeof a.render).toBe('function');
    expect(typeof a.extraKeyHandler).toBe('function');
    expect(a.hooks).toBeDefined();
  });

  it('queue + hooks: nextTask/fifo, labels, totals, onProgress, onResult', async () => {
    await chunkCsv.call(ctx, baseFlags);
    const hooks = H.lastRunPoolArgs.hooks!;
    // nextTask drains FIFO of discovered files turned into ChunkTask
    const seen: string[] = [];
    for (;;) {
      const t = hooks.nextTask?.();
      if (!t) break;
      seen.push(t.filePath);
      // taskLabel echoes filePath
      expect(hooks.taskLabel?.(t)).toBe(t.filePath);
      // initSlotProgress returns undefined
      expect(hooks.initSlotProgress?.(t)).toBeUndefined();
    }
    expect(seen).toEqual(H.files); // FIFO order

    // totals are an empty record
    const totals = hooks.initTotals?.() ?? {};
    expect(totals).toEqual({});

    // onProgress returns same totals object (identity)
    const progressed = hooks.onProgress?.(totals, {
      filePath: '/abs/a.csv',
      processed: 1,
    });
    expect(progressed).toBe(totals);

    // onResult sets ok based on res.ok
    const r1 = hooks.onResult?.(totals, {
      ok: true,
      filePath: '/abs/a.csv',
    });
    expect(r1?.ok).toBe(true);
    const r2 = hooks.onResult?.(totals, {
      ok: false,
      filePath: '/abs/b.csv',
    });
    expect(r2?.ok).toBe(false);

    // postProcess is a no-op
    await hooks.postProcess?.({
      slots: new Map(),
      totals,
      logDir: '/logs',
      logsBySlot: new Map(),
      startedAt: 1,
      finishedAt: 2,
      getLogPathsForSlot: () => undefined,
      viewerMode: true,
    });
  });

  it('spreads context-bound pooling UI callbacks into runPool', async () => {
    await chunkCsv.call(ctx, baseFlags);

    expect(H.pooling.createPoolingCommandUi).toHaveBeenCalledWith(ctx, chunkCsvPlugin, true);
    expect(H.lastRunPoolArgs.render).toBe(H.pooling.render);
    expect(H.lastRunPoolArgs.installInteractiveSwitcher).toBe(H.pooling.installInteractiveSwitcher);
    expect(H.lastRunPoolArgs.extraKeyHandler).toBe(H.pooling.extraKeyHandler);
  });

  it('passes non-viewer mode to the pooling UI factory', async () => {
    await chunkCsv.call(ctx, { ...baseFlags, viewerMode: false });

    expect(H.pooling.createPoolingCommandUi).toHaveBeenCalledWith(ctx, chunkCsvPlugin, false);
  });

  it('uses outputDir as baseDir when directory is empty', async () => {
    await chunkCsv.call(ctx, { ...baseFlags, directory: '' });
    expect(H.lastRunPoolArgs.baseDir).toBe(baseFlags.outputDir);
  });

  it('falls back to cwd as baseDir when directory and outputDir are empty', async () => {
    await chunkCsv.call(ctx, {
      ...baseFlags,
      directory: '',
      outputDir: '',
    });
    expect(H.lastRunPoolArgs.baseDir).toBe(ctx.process.cwd());
  });
});
