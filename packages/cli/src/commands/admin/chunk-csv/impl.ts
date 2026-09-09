import {
  CHILD_FLAG,
  type PoolHooks,
  runPool,
  computePoolSize,
  PoolCancelledError,
  resolveWorkerPath,
} from '@transcend-io/utils';
import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { collectCsvFilesOrExit } from '../../../lib/helpers/collectCsvFilesOrExit.js';
import { createPoolingCommandUi } from '../../../lib/pooling/index.js';
import { chunkCsvPlugin } from './ui/index.js';
import type { ChunkProgress, ChunkResult, ChunkTask } from './worker.js';

/**
 * Totals aggregate for this command.
 * We don’t need custom counters since the runner already tracks
 * completed/failed counts in its header — so we just use an empty record.
 */
type Totals = Record<string, never>;

/**
 * CLI flags accepted by the `chunk-csv` command.
 *
 * These are passed down from the CLI parser into the parent process.
 */
export type ChunkCsvCommandFlags = {
  directory: string;
  outputDir?: string;
  clearOutputDir: boolean;
  chunkSizeMB: number;
  concurrency?: number;
  viewerMode: boolean;
};

/**
 * Parent entrypoint for chunking many CSVs in parallel using the worker pool runner.
 *
 * Lifecycle:
 *  1) Discover CSV inputs (exit if none).
 *  2) Compute pool size (CPU-count heuristic or --concurrency).
 *  3) Build a FIFO queue of `ChunkTask`s.
 *  4) Define pool hooks to drive task assignment, progress, and result handling.
 *  5) Launch the pool with `runPool`, rendering via the `chunkCsvPlugin`.
 *
 * @param this  - Bound CLI context (provides process exit + logging).
 * @param flags - CLI options for the run.
 */
export async function chunkCsv(this: LocalContext, flags: ChunkCsvCommandFlags): Promise<void> {
  doneInputValidation(this.process);

  const { directory, outputDir, clearOutputDir, chunkSizeMB, concurrency, viewerMode } = flags;
  const poolingUi = createPoolingCommandUi(this, chunkCsvPlugin, viewerMode);

  /* 1) Discover CSV inputs */
  const files = collectCsvFilesOrExit(directory, this);

  /* 2) Size the pool */
  const { poolSize, cpuCount } = computePoolSize(concurrency, files.length);

  this.logger.info(
    colors.green(
      `Chunking ${files.length} CSV file(s) with pool size ${poolSize} (CPU=${cpuCount})`,
    ),
  );

  /* 3) Prepare a simple FIFO queue of tasks (one per file). */
  const queue = files.map<ChunkTask>((filePath) => ({
    filePath,
    options: { outputDir, clearOutputDir, chunkSizeMB },
  }));

  /* 4) Define pool hooks to adapt runner to this command. */
  const hooks: PoolHooks<ChunkTask, ChunkProgress, ChunkResult, Totals> = {
    nextTask: () => queue.shift(),
    taskLabel: (t) => t.filePath,
    initTotals: () => ({}) as Totals,
    initSlotProgress: () => undefined,
    onProgress: (totals) => totals,
    onResult: (totals, res) => ({ totals, ok: !!res.ok }),
    // postProcess receives log context when viewerMode=true — we don’t need it here.
    postProcess: async () => {
      // nothing extra for chunk-csv
    },
  };

  /* 5) Launch the pool runner with our hooks and custom dashboard plugin. */
  await runPool({
    title: `Chunk CSV - ${directory}`,
    baseDir: directory || outputDir || this.process.cwd(),
    childFlag: CHILD_FLAG,
    childModulePath: resolveWorkerPath(import.meta.url, 'commands/admin/chunk-csv/worker.mjs'),
    poolSize,
    cpuCount,
    filesTotal: files.length,
    hooks,
    viewerMode,
    ...poolingUi,
  }).catch((err) => {
    if (err instanceof PoolCancelledError) {
      this.process.exit(130);
    }
    throw err;
  });
}
