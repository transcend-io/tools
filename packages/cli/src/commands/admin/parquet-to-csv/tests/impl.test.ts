import type { PoolHooks } from '@transcend-io/utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { parquetToCsv, type ParquetToCsvCommandFlags } from '../impl.js';
import { parquetToCsvPlugin } from '../ui/index.js';
import type { ParquetTask, ParquetProgress, ParquetResult } from '../worker.js';

const H = vi.hoisted(() => {
  const files = ['/abs/a.parquet', '/abs/b.parquet', '/abs/c.parquet'];

  // capture the last runPool args so tests can assert hooks later
  const lastRunPoolArgs: {
    title?: string;
    baseDir?: string;
    childFlag?: string;
    childModulePath?: string;
    poolSize?: number;
    cpuCount?: number;
    filesTotal?: number;
    hooks?: PoolHooks<ParquetTask, ParquetProgress, ParquetResult, Record<string, never>>;
    viewerMode?: boolean;
    render?: (input: unknown) => unknown;
    extraKeyHandler?: (args: {
      logsBySlot: Map<number, string[]>;
      repaint: () => void;
      setPaused: (p: boolean) => void;
    }) => unknown;
  } = {};

  const pooling = {
    CHILD_FLAG: '--child',
    computePoolSize: vi.fn(() => ({
      poolSize: 5,
      cpuCount: 8,
    })),
    // runPool will just record its args for later inspection
    runPool: vi.fn(async (args: typeof lastRunPoolArgs): Promise<void> => {
      Object.assign(lastRunPoolArgs, args);
    }),
    dashboardPlugin: vi.fn((input: unknown, plugin: unknown, viewerMode: boolean) => ({
      input,
      plugin,
      viewerMode,
      tag: 'dashboard-plugin-result',
    })),
    createExtraKeyHandler: vi.fn(
      (o: {
        logsBySlot: Map<number, string[]>;
        repaint: () => void;
        setPaused: (p: boolean) => void;
      }) => ({
        ...o,
        tag: 'extra-key-handler',
      }),
    ),
  };

  const helpers = {
    collectParquetFilesOrExit: vi.fn(() => files.slice()),
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

  return {
    files,
    pooling,
    helpers,
    colors,
    lastRunPoolArgs,
  };
});

// --- Module mocks (MUST be before importing the SUT code paths) -------------------------------
// single colors mock with default export (SUT does `import colors from 'colors'`)
vi.mock('colors', () => ({
  __esModule: true,
  default: H.colors,
  ...H.colors, // support named import style just in case
}));

vi.mock('../../../../lib/helpers/index.js', () => ({
  collectParquetFilesOrExit: H.helpers.collectParquetFilesOrExit,
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
    dashboardPlugin: H.pooling.dashboardPlugin,
    createExtraKeyHandler: H.pooling.createExtraKeyHandler,
  };
});

// -------------------------------------------------------------------------------------------------

describe('parquetToCsv', () => {
  const ctx = buildContextForTest({
    cwd: '/test/cwd',
    env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'false' },
  });

  const baseFlags: ParquetToCsvCommandFlags = {
    directory: '/abs',
    outputDir: '/out',
    clearOutputDir: true,
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

  it('runs input validation using the context process', async () => {
    await parquetToCsv.call(ctx, baseFlags);
    expect(ctx.exit).not.toHaveBeenCalled();
  });

  it('discovers files, sizes the pool, logs, builds queue, and invokes runPool with expected args', async () => {
    await parquetToCsv.call(ctx, baseFlags);

    // discovery
    expect(H.helpers.collectParquetFilesOrExit).toHaveBeenCalledWith(baseFlags.directory, ctx);

    // sizing
    expect(H.pooling.computePoolSize).toHaveBeenCalledWith(undefined, H.files.length);

    // info log includes file count and pool size text (unstyled)
    expect(ctx.stdout).toContain(`Converting ${H.files.length} Parquet file(s)`);
    expect(ctx.stdout).toContain('pool size 5');
    expect(ctx.stdout).toContain('CPU=8');

    // runPool called once
    expect(H.pooling.runPool).toHaveBeenCalledTimes(1);

    const a = H.lastRunPoolArgs;
    expect(a.title).toBe('Parquet → CSV - /abs');
    // baseDir prefers directory (present)
    expect(a.baseDir).toBe(baseFlags.directory);
    expect(a.childFlag).toBe(H.pooling.CHILD_FLAG);
    expect(typeof a.childModulePath).toBe('string'); // env-dependent
    expect(a.poolSize).toBe(5);
    expect(a.cpuCount).toBe(8);
    expect(a.filesTotal).toBe(H.files.length);
    expect(a.viewerMode).toBe(true);
    expect(typeof a.render).toBe('function');
    expect(typeof a.extraKeyHandler).toBe('function');
    expect(a.hooks).toBeDefined();
  });

  it('queue + hooks: nextTask/fifo, labels, totals, onProgress, onResult', async () => {
    await parquetToCsv.call(ctx, baseFlags);
    const hooks = H.lastRunPoolArgs.hooks!;
    // nextTask drains FIFO of discovered files turned into ParquetTask
    const seen: string[] = [];
    for (;;) {
      const t = hooks.nextTask?.();
      if (!t) break;
      seen.push(t.filePath);
      // taskLabel echoes filePath
      expect(hooks.taskLabel?.(t)).toBe(t.filePath);
      // options are wired from flags
      expect(t.options).toEqual({
        outputDir: baseFlags.outputDir,
        clearOutputDir: baseFlags.clearOutputDir,
      });
      // initSlotProgress returns undefined
      expect(hooks.initSlotProgress?.(t)).toBeUndefined();
    }
    expect(seen).toEqual(H.files); // FIFO order

    // totals are an empty record
    const totals = hooks.initTotals?.();
    expect(totals).toEqual({});

    // onProgress returns same totals object (identity)
    const progressed = hooks.onProgress?.(
      totals as Record<string, never>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
    );
    expect(progressed).toBe(totals);

    // onResult sets ok based on res.ok
    const r1 = hooks.onResult?.(totals as Record<string, never>, { ok: true } as ParquetResult);
    expect(r1?.ok).toBe(true);
    const r2 = hooks.onResult?.(totals as Record<string, never>, { ok: false } as ParquetResult);
    expect(r2?.ok).toBe(false);

    // postProcess is a no-op
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await hooks.postProcess?.({} as any);
  });

  it('render delegates to dashboardPlugin with parquetToCsvPlugin and viewerMode', async () => {
    await parquetToCsv.call(ctx, baseFlags);
    const render = H.lastRunPoolArgs.render!;
    const input = { pretend: 'frame' };
    const result = render(input);

    expect(H.pooling.dashboardPlugin).toHaveBeenCalledTimes(1);
    const call = H.pooling.dashboardPlugin.mock.calls[0];
    expect(call?.[0]).toBe(input);
    expect(call?.[1]).toBe(parquetToCsvPlugin);
    expect(call?.[2]).toBe(true);

    // just assert passthrough of whatever dashboardPlugin returns
    expect(result).toEqual({
      input,
      plugin: parquetToCsvPlugin,
      viewerMode: true,
      tag: 'dashboard-plugin-result',
    });
  });

  it('extraKeyHandler is built via createExtraKeyHandler and passes through logs/repaint/setPaused', async () => {
    await parquetToCsv.call(ctx, baseFlags);
    const ek = H.lastRunPoolArgs.extraKeyHandler!;
    const logsBySlot = new Map<number, string[]>();
    const repaint = vi.fn();
    const setPaused = vi.fn();

    const out = ek({ logsBySlot, repaint, setPaused });

    expect(H.pooling.createExtraKeyHandler).toHaveBeenCalledTimes(1);
    const call = H.pooling.createExtraKeyHandler.mock.calls[0]?.[0];
    expect(call.logsBySlot).toBe(logsBySlot);
    expect(call.repaint).toBe(repaint);
    expect(call.setPaused).toBe(setPaused);

    // passthrough object from our mock
    expect(out).toEqual({
      logsBySlot,
      repaint,
      setPaused,
      tag: 'extra-key-handler',
    });
  });

  it('uses outputDir as baseDir when directory is empty', async () => {
    await parquetToCsv.call(ctx, { ...baseFlags, directory: '' });
    expect(H.lastRunPoolArgs.baseDir).toBe(baseFlags.outputDir);
  });

  it('falls back to cwd as baseDir when directory and outputDir are empty', async () => {
    await parquetToCsv.call(ctx, {
      ...baseFlags,
      directory: '',
      outputDir: '',
    });
    expect(H.lastRunPoolArgs.baseDir).toBe(ctx.process.cwd());
  });

  it('passes an explicit concurrency override to computePoolSize', async () => {
    await parquetToCsv.call(ctx, { ...baseFlags, concurrency: 12 });
    expect(H.pooling.computePoolSize).toHaveBeenCalledWith(12, H.files.length);
  });
});
