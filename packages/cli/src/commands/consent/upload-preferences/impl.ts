import { join } from 'node:path';

import {
  chunkOneCsvFile,
  CHILD_FLAG,
  type PoolHooks,
  runPool,
  buildExportStatus,
  computePoolSize,
  resolveWorkerPath,
  PoolCancelledError,
} from '@transcend-io/utils';
import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { collectCsvFilesOrExit } from '../../../lib/helpers/collectCsvFilesOrExit.js';
import { createPoolingCommandUi } from '../../../lib/pooling/index.js';
import {
  computeReceiptsFolder,
  computeSchemaFile,
  ExportManager,
  writeFailingUpdatesCsv,
  type FailingUpdateRow,
} from './artifacts/index.js';
import { applyReceiptSummary } from './artifacts/receipts/index.js';
import { buildCommonOpts } from './helpers.js';
import {
  type AnyTotals,
  isUploadModeTotals,
  isCheckModeTotals,
  uploadPreferencesPlugin,
  type UploadPreferencesSlotProgress,
} from './ui/index.js';

/**
 * A unit of work: instructs a worker to upload (or check) a single CSV file.
 */
export type UploadPreferencesTask = {
  /** Absolute path of the CSV file to process. */
  filePath: string;
  /** Command/worker options shared across tasks (built from CLI flags). */
  options: ReturnType<typeof buildCommonOpts>;
};

/**
 * Final result for a single file.
 */
export type UploadPreferencesResult = {
  /** Success flag for the file. */
  ok: boolean;
  /** File this result pertains to. */
  filePath: string;
  /** Optional path to the worker-generated receipt file. */
  receiptFilepath?: string;
  /** Optional error string when `ok === false`. */
  error?: string;
};

export interface UploadPreferencesCommandFlags {
  auth: string;
  partition: string;
  sombraAuth?: string;
  transcendUrl: string;
  directory: string;
  dryRun: boolean;
  skipExistingRecordCheck: boolean;
  receiptFileDir?: string;
  schemaFilePath?: string;
  skipWorkflowTriggers: boolean;
  forceTriggerWorkflows: boolean;
  skipConflictUpdates: boolean;
  isSilent: boolean;
  attributes: string;
  concurrency?: number;
  uploadConcurrency: number;
  maxChunkSize: number;
  rateLimitRetryDelay: number;
  uploadLogInterval: number;
  downloadIdentifierConcurrency: number;
  maxRecordsToReceipt: number;
  regenerate: boolean;
  chunkSizeMB: number;
  viewerMode: boolean;
}

/**
 * Parent entrypoint for uploading/checking many preference CSVs in parallel.
 *
 * Flow:
 *  1) Validate inputs, discover CSV files, and auto-chunk oversized files.
 *  2) Ensure a column-mapping config exists (or run the configure flow with --regenerate).
 *  3) Compute pool size from `--concurrency` or CPU heuristic.
 *  4) Build `common` worker options and task queue (one task per file).
 *  5) Launch the pool with `runPool`, rendering via `uploadPreferencesPlugin`.
 *
 * @param flags - CLI options for the run.
 * @returns Promise that resolves when the pool completes.
 */
export async function uploadPreferences(
  this: LocalContext,
  flags: UploadPreferencesCommandFlags,
): Promise<void> {
  const {
    auth,
    partition,
    sombraAuth,
    transcendUrl,
    directory,
    skipExistingRecordCheck,
    receiptFileDir,
    schemaFilePath,
    concurrency,
    regenerate,
    chunkSizeMB,
    viewerMode,
  } = flags;

  /* 1) Validate & find inputs */
  let files = collectCsvFilesOrExit(directory, this);
  doneInputValidation(this.process);

  /* 1b) Auto-chunk oversized files. Chunks land next to the original, which stays on disk but is not uploaded. */
  if (chunkSizeMB > 0) {
    const chunkThreshold = chunkSizeMB * 1024 * 1024;
    const oversized = files.filter((f) => {
      try {
        return this.fs.statSync(f).size > chunkThreshold;
      } catch {
        return false;
      }
    });
    if (oversized.length > 0) {
      this.logger.info(
        colors.yellow(`Auto-chunking ${oversized.length} file(s) exceeding ${chunkSizeMB}MB...`),
      );
      for (const file of oversized) {
        await chunkOneCsvFile({
          filePath: file,
          outputDir: directory,
          clearOutputDir: false,
          chunkSizeMB,
          logger: this.logger,
          onProgress: () => undefined,
        });
      }
      const chunked = new Set(oversized);
      files = collectCsvFilesOrExit(directory, this).filter((f) => !chunked.has(f));
    }
  }

  this.logger.info(
    colors.green(
      `Processing ${files.length} consent preferences files for partition: ${partition}`,
    ),
  );
  this.logger.debug(
    `Files to process:\n${files.slice(0, 10).join('\n')}\n${
      files.length > 10 ? `... and ${files.length - 10} more` : ''
    }`,
  );

  if (skipExistingRecordCheck) {
    this.logger.info(colors.bgYellow('Skipping existing record check: true'));
  }

  const receiptsFolder = computeReceiptsFolder(receiptFileDir, directory);
  const schemaFile = computeSchemaFile(schemaFilePath, directory, files[0]!);

  /* 2) Ensure the column-mapping config exists */
  if (regenerate) {
    this.logger.info(colors.yellow('Running interactive config generation...'));
    const { configurePreferenceUpload } = await import('../configure-preference-upload/impl.js');
    await configurePreferenceUpload.call(this, {
      auth,
      sombraAuth,
      transcendUrl,
      directory,
      schemaFilePath,
      partition,
    });
  } else if (!this.fs.existsSync(schemaFile)) {
    this.logger.error(
      colors.red(
        `No config file found at: ${schemaFile}\n` +
          "Run 'transcend consent configure-preference-upload' to create one, " +
          'or pass --regenerate to run the interactive setup now.',
      ),
    );
    this.process.exit(1);
    return;
  }

  /* 3) Pool size */
  const { poolSize, cpuCount } = computePoolSize(concurrency, files.length);

  /* 4) Build shared worker options and queue */
  const common = buildCommonOpts(flags, schemaFile, receiptsFolder);
  const queue = files.map<UploadPreferencesTask>((filePath) => ({
    filePath,
    options: common,
  }));

  const exportMgr = new ExportManager(receiptsFolder);
  const exportStatus = buildExportStatus(receiptsFolder);
  const failingUpdatesMem: FailingUpdateRow[] = [];
  const failingUpdatesCsvPath = join(receiptsFolder, 'failing-updates.csv');

  const hooks: PoolHooks<
    UploadPreferencesTask,
    UploadPreferencesSlotProgress,
    UploadPreferencesResult,
    AnyTotals
  > = {
    nextTask: () => queue.shift(),
    taskLabel: (t) => t.filePath,
    initTotals: () =>
      !common.dryRun
        ? { mode: 'upload', success: 0, skipped: 0, error: 0, errors: {} }
        : { mode: 'check', totalPending: 0, pendingConflicts: 0, pendingSafe: 0, skipped: 0 },
    initSlotProgress: () => undefined,
    onProgress: (totals) => totals,
    onResult: (totals, res) => {
      applyReceiptSummary({
        receiptsFolder: common.receiptsFolder,
        filePath: res.filePath,
        receiptFilepath: res.receiptFilepath,
        agg: totals,
        dryRun: common.dryRun,
        failingUpdatesMem,
      });
      return { totals, ok: !!res.ok };
    },
    exportStatus: () => exportStatus,
    postProcess: async ({ totals, logsBySlot }) => {
      try {
        await writeFailingUpdatesCsv(failingUpdatesMem, failingUpdatesCsvPath);
        exportStatus.failuresCsv = {
          path: failingUpdatesCsvPath,
          savedAt: Date.now(),
          exported: true,
        };

        await Promise.all([
          exportMgr.exportCombinedLogs(logsBySlot, 'error'),
          exportMgr.exportCombinedLogs(logsBySlot, 'warn'),
          exportMgr.exportCombinedLogs(logsBySlot, 'info'),
          exportMgr.exportCombinedLogs(logsBySlot, 'all'),
        ]);

        if (isUploadModeTotals(totals)) {
          this.logger.info(
            colors.green(
              `All done. Success:${totals.success.toLocaleString()}  ` +
                `Skipped:${totals.skipped.toLocaleString()}  ` +
                `Error:${totals.error.toLocaleString()}`,
            ),
          );
        } else if (isCheckModeTotals(totals)) {
          this.logger.info(
            colors.green(
              `All done. Pending:${totals.totalPending.toLocaleString()}  ` +
                `PendingConflicts:${totals.pendingConflicts.toLocaleString()}  ` +
                `PendingSafe:${totals.pendingSafe.toLocaleString()}  ` +
                `Skipped:${totals.skipped.toLocaleString()}`,
            ),
          );
        }
      } catch (err: unknown) {
        this.logger.error(colors.red(`Failed to export artifacts: ${String(err)}`));
      }
    },
  };

  const poolingUi = createPoolingCommandUi(this, uploadPreferencesPlugin, viewerMode, {
    exportMgr,
    exportStatus,
    custom: {
      F: async ({ noteExport, say }) => {
        await writeFailingUpdatesCsv(failingUpdatesMem, failingUpdatesCsvPath);
        say(`\nWrote failing updates CSV to: ${failingUpdatesCsvPath}`);
        noteExport('failuresCsv', failingUpdatesCsvPath);
      },
    },
  });

  /* 5) Launch the pool runner */
  await runPool({
    title: `Upload Preferences - ${directory}`,
    baseDir: directory || receiptsFolder || this.process.cwd(),
    childFlag: CHILD_FLAG,
    childModulePath: resolveWorkerPath(
      import.meta.url,
      'commands/consent/upload-preferences/worker.mjs',
    ),
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
