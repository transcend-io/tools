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
import { collectParquetFilesOrExit } from '../../../lib/helpers/index.js';
import {
  createExtraKeyHandler,
  dashboardPlugin,
  installInteractiveSwitcher,
} from '../../../lib/pooling/index.js';
import { logger } from '../../../logger.js';
import { parquetToCsvPlugin } from './ui/index.js';
import type { ParquetProgress, ParquetResult, ParquetTask } from './worker.js';

/** No custom totals for the header; the runner’s built-ins suffice. */
type Totals = Record<string, never>;

export type ParquetToCsvCommandFlags = {
  directory: string;
  outputDir?: string;
  clearOutputDir: boolean;
  concurrency?: number;
  viewerMode: boolean;
};

/**
 * Convert all Parquet files in a directory to CSV, in parallel.
 *
 * @param flags - The command flags.
 */
export async function parquetToCsv(
  this: LocalContext,
  flags: ParquetToCsvCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  const { directory, outputDir, clearOutputDir, concurrency, viewerMode } = flags;

  /* 1) Discover .parquet inputs */
  const files = collectParquetFilesOrExit(directory, this);

  /* 2) Size the pool */
  const { poolSize, cpuCount } = computePoolSize(concurrency, files.length);

  logger.info(
    colors.green(
      `Converting ${files.length} Parquet file(s) → CSV with pool size ${poolSize} (CPU=${cpuCount})`,
    ),
  );

  /* 3) Build FIFO queue of tasks (one per file) */
  const queue = files.map<ParquetTask>((filePath) => ({
    filePath,
    options: { outputDir, clearOutputDir },
  }));

  /* 4) Pool hooks */
  const hooks: PoolHooks<ParquetTask, ParquetProgress, ParquetResult, Totals> = {
    nextTask: () => queue.shift(),
    taskLabel: (t) => t.filePath,
    initTotals: () => ({}) as Totals,
    initSlotProgress: () => undefined,
    onProgress: (totals) => totals,
    onResult: (totals, res) => ({ totals, ok: !!res.ok }),
    postProcess: async () => {
      // nothing special post-run
    },
  };

  /* 5) Launch the pool runner with custom dashboard plugin */
  await runPool({
    title: `Parquet → CSV - ${directory}`,
    baseDir: directory || outputDir || process.cwd(),
    childFlag: CHILD_FLAG,
    childModulePath: resolveWorkerPath(import.meta.url, 'commands/admin/parquet-to-csv/worker.mjs'),
    poolSize,
    cpuCount,
    filesTotal: files.length,
    hooks,
    viewerMode,
    render: (input) => dashboardPlugin(input, parquetToCsvPlugin, viewerMode),
    installInteractiveSwitcher: viewerMode
      ? undefined
      : ({
          workers,
          onCtrlC,
          getLogPaths,
          replayBytes: rb,
          replayWhich: rw,
          setPaused,
          repaint: rp,
        }) =>
          installInteractiveSwitcher({
            workers,
            onCtrlC,
            getLogPaths,
            replayBytes: rb,
            replayWhich: rw,
            onAttach: () => setPaused(true),
            onDetach: () => {
              setPaused(false);
              rp();
            },
            onEnterAttachScreen: (id) => {
              setPaused(true);
              process.stdout.write('\x1b[2J\x1b[H');
              process.stdout.write(
                `Attached to worker ${id}. (Esc/Ctrl+] detach \u2022 Ctrl+D EOF \u2022 Ctrl+C SIGINT)\n`,
              );
            },
          }),
    extraKeyHandler: ({ logsBySlot, repaint, setPaused }) =>
      createExtraKeyHandler({ logsBySlot, repaint, setPaused }),
  }).catch((err) => {
    if (err instanceof PoolCancelledError) {
      process.exit(130);
    }
    throw err;
  });
}
