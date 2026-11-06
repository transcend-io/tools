import fs, { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PoolCancelledError, type PoolHooks } from '@transcend-io/utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  buildContextForTest,
  TestProcessExitError,
} from '../../../../lib/tests/helpers/buildContextForTest.js';
import { ExportManager } from '../artifacts/index.js';
import {
  uploadPreferences,
  type UploadPreferencesCommandFlags,
  type UploadPreferencesResult,
  type UploadPreferencesTask,
} from '../impl.js';
import {
  uploadPreferencesPlugin,
  type AnyTotals,
  type UploadPreferencesSlotProgress,
} from '../ui/index.js';

const H = vi.hoisted(() => {
  const lastRunPoolArgs: {
    /** Dashboard title */
    title?: string;
    /** Worker module path */
    childModulePath?: string;
    /** Pool size */
    poolSize?: number;
    /** Number of files */
    filesTotal?: number;
    /** Viewer mode */
    viewerMode?: boolean;
    /** Pool hooks */
    hooks?: PoolHooks<
      UploadPreferencesTask,
      UploadPreferencesSlotProgress,
      UploadPreferencesResult,
      AnyTotals
    >;
    /** Render callback */
    render?: unknown;
  } = {};

  const pooling = {
    computePoolSize: vi.fn(() => ({ poolSize: 3, cpuCount: 8 })),
    runPool: vi.fn(async (args: typeof lastRunPoolArgs): Promise<void> => {
      Object.assign(lastRunPoolArgs, args);
    }),
    chunkOneCsvFile: vi.fn(async () => undefined),
    render: vi.fn(),
    createPoolingCommandUi: vi.fn(() => ({ render: pooling.render })),
  };

  return {
    lastRunPoolArgs,
    pooling,
    collectCsvFilesOrExit: vi.fn((): string[] => []),
    configurePreferenceUpload: vi.fn(async () => undefined),
  };
});

vi.mock('colors', () => {
  const id = (s: string): string => s;
  const colors = { green: id, yellow: id, red: id, bgYellow: id };
  return { __esModule: true, default: colors, ...colors };
});

vi.mock('@transcend-io/utils', async () => {
  const actual = await vi.importActual<typeof import('@transcend-io/utils')>('@transcend-io/utils');
  return {
    ...actual,
    computePoolSize: H.pooling.computePoolSize,
    runPool: H.pooling.runPool,
    chunkOneCsvFile: H.pooling.chunkOneCsvFile,
  };
});

vi.mock('../../../../lib/pooling/index.js', async () => {
  const actual = await vi.importActual<typeof import('../../../../lib/pooling/index.js')>(
    '../../../../lib/pooling/index.js',
  );
  return { ...actual, createPoolingCommandUi: H.pooling.createPoolingCommandUi };
});

vi.mock('../../../../lib/helpers/collectCsvFilesOrExit.js', () => ({
  collectCsvFilesOrExit: H.collectCsvFilesOrExit,
}));

vi.mock('../../configure-preference-upload/impl.js', () => ({
  configurePreferenceUpload: H.configurePreferenceUpload,
}));

/**
 * Build a filesystem double with controllable file sizes and existence.
 *
 * @param opts - File sizes and paths that exist
 * @returns Filesystem implementation
 */
function buildFs(opts: {
  /** File size in bytes by path */
  sizes?: Record<string, number>;
  /** Paths reported as existing */
  existing?: string[];
}): typeof fs {
  return {
    ...fs,
    statSync: vi.fn((p: string) => ({ size: opts.sizes?.[p] ?? 10 })),
    existsSync: vi.fn((p: string) => (opts.existing ?? []).includes(p)),
  } as unknown as typeof fs;
}

describe('uploadPreferences', () => {
  const schemaFilePath = '/abs/schema.json';
  let receiptFileDir: string;
  let baseFlags: UploadPreferencesCommandFlags;

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(H.lastRunPoolArgs)) {
      delete H.lastRunPoolArgs[key as keyof typeof H.lastRunPoolArgs];
    }
    H.collectCsvFilesOrExit.mockReturnValue(['/abs/a.csv', '/abs/b.csv']);
    receiptFileDir = mkdtempSync(join(tmpdir(), 'upload-preferences-'));
    baseFlags = {
      auth: 'key',
      partition: 'partition-1',
      transcendUrl: 'https://api.transcend.io',
      directory: '/abs',
      dryRun: false,
      skipExistingRecordCheck: false,
      receiptFileDir,
      schemaFilePath,
      skipWorkflowTriggers: false,
      forceTriggerWorkflows: false,
      skipConflictUpdates: false,
      isSilent: true,
      attributes: 'Tags:transcend-cli',
      uploadConcurrency: 25,
      maxChunkSize: 25,
      rateLimitRetryDelay: 3000,
      uploadLogInterval: 1000,
      downloadIdentifierConcurrency: 30,
      maxRecordsToReceipt: 10,
      regenerate: false,
      chunkSizeMB: 11,
      viewerMode: false,
    };
  });

  it('exits with an error when no config file exists', async () => {
    const ctx = buildContextForTest({ fs: buildFs({}), exitBehavior: 'record' });

    await uploadPreferences.call(ctx, baseFlags);

    expect(ctx.exit).toHaveBeenCalledWith(1);
    expect(ctx.stderr).toContain(`No config file found at: ${schemaFilePath}`);
    expect(H.pooling.runPool).not.toHaveBeenCalled();
  });

  it('queues one task per file and wires the shared pooling UI', async () => {
    const ctx = buildContextForTest({ fs: buildFs({ existing: [schemaFilePath] }) });

    await uploadPreferences.call(ctx, baseFlags);

    expect(H.pooling.computePoolSize).toHaveBeenCalledWith(undefined, 2);
    expect(H.pooling.createPoolingCommandUi).toHaveBeenCalledWith(
      ctx,
      uploadPreferencesPlugin,
      false,
      {
        exportMgr: expect.any(ExportManager),
        exportStatus: expect.any(Object),
        custom: { F: expect.any(Function) },
      },
    );

    const args = H.lastRunPoolArgs;
    expect(args.title).toBe('Upload Preferences - /abs');
    expect(args.childModulePath).toContain('upload-preferences/worker');
    expect(args.poolSize).toBe(3);
    expect(args.filesTotal).toBe(2);
    expect(args.render).toBe(H.pooling.render);

    const tasks: UploadPreferencesTask[] = [];
    for (let t = args.hooks?.nextTask(); t; t = args.hooks?.nextTask()) {
      tasks.push(t);
    }
    expect(tasks.map((t) => t.filePath)).toEqual(['/abs/a.csv', '/abs/b.csv']);
    expect(tasks[0]!.options).toMatchObject({
      schemaFile: schemaFilePath,
      receiptsFolder: receiptFileDir,
      partition: 'partition-1',
      uploadConcurrency: 25,
    });
  });

  it('uses check-mode totals for dry runs', async () => {
    const ctx = buildContextForTest({ fs: buildFs({ existing: [schemaFilePath] }) });

    await uploadPreferences.call(ctx, { ...baseFlags, dryRun: true });

    expect(H.lastRunPoolArgs.hooks?.initTotals?.()).toEqual({
      mode: 'check',
      totalPending: 0,
      pendingConflicts: 0,
      pendingSafe: 0,
      skipped: 0,
    });
  });

  it('chunks oversized files and uploads only the chunks', async () => {
    const big = '/abs/big.csv';
    H.collectCsvFilesOrExit
      .mockReturnValueOnce(['/abs/a.csv', big])
      .mockReturnValueOnce(['/abs/a.csv', big, '/abs/big_chunk_0001.csv']);
    const ctx = buildContextForTest({
      fs: buildFs({ existing: [schemaFilePath], sizes: { [big]: 12 * 1024 * 1024 } }),
    });

    await uploadPreferences.call(ctx, baseFlags);

    expect(H.pooling.chunkOneCsvFile).toHaveBeenCalledTimes(1);
    expect(H.pooling.chunkOneCsvFile).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: big, outputDir: '/abs', chunkSizeMB: 11 }),
    );
    const queued: string[] = [];
    for (let t = H.lastRunPoolArgs.hooks?.nextTask(); t; t = H.lastRunPoolArgs.hooks?.nextTask()) {
      queued.push(t.filePath);
    }
    expect(queued).toEqual(['/abs/a.csv', '/abs/big_chunk_0001.csv']);
  });

  it('runs the configure flow when --regenerate is set', async () => {
    const ctx = buildContextForTest({ fs: buildFs({}) });

    await uploadPreferences.call(ctx, { ...baseFlags, regenerate: true });

    expect(H.configurePreferenceUpload).toHaveBeenCalledWith({
      auth: 'key',
      sombraAuth: undefined,
      transcendUrl: 'https://api.transcend.io',
      directory: '/abs',
      schemaFilePath,
      partition: 'partition-1',
    });
    expect(H.pooling.runPool).toHaveBeenCalledTimes(1);
  });

  it('exits with 130 when the pool is cancelled', async () => {
    H.pooling.runPool.mockRejectedValueOnce(new PoolCancelledError());
    const ctx = buildContextForTest({ fs: buildFs({ existing: [schemaFilePath] }) });

    await expect(uploadPreferences.call(ctx, baseFlags)).rejects.toThrow(TestProcessExitError);
    expect(ctx.exit).toHaveBeenCalledWith(130);
  });
});
