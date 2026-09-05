import {
  makeHeader,
  makeWorkerRows,
  type ChunkSlotProgress,
  type CommonCtx,
  type DashboardPlugin,
} from '../../../../lib/pooling/index.js';

/**
 * Header for parquet-to-csv (no extra totals block).
 *
 * @param ctx - Dashboard context.
 * @returns Header lines.
 */
function renderHeader<TTotals>(ctx: CommonCtx<TTotals, ChunkSlotProgress>): string[] {
  // no extra lines — reuse the shared header as-is
  return makeHeader(ctx);
}

/**
 * Worker rows for parquet-to-csv — share the generic row renderer.
 *
 * @param ctx - Dashboard context.
 * @param now - Return the current Unix timestamp in milliseconds.
 * @returns Array of strings, each representing one worker row.
 */
function renderWorkers<TTotals>(
  ctx: CommonCtx<TTotals, ChunkSlotProgress>,
  now: () => number = Date.now,
): string[] {
  return makeWorkerRows(ctx, undefined, now);
}

export const parquetToCsvPlugin: DashboardPlugin<unknown, ChunkSlotProgress> = {
  renderHeader,
  renderWorkers,
  // no extras
};
