/* eslint-disable no-continue */
import { once } from 'node:events';
import { createReadStream, createWriteStream, mkdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

import type { SlotPaths, WorkerLogPaths } from '@transcend-io/utils';

/** Which combined log to export */
export type LogKind = 'error' | 'warn' | 'info' | 'all';

/** File metadata needed while exporting combined logs. */
export interface ExportLogFileStat {
  /** File size in bytes */
  readonly size: number;
}

/** Dependencies used to export combined logs. */
export interface ExportCombinedLogsDependencies {
  /** Return the final component of a path. */
  basename: typeof basename;
  /** Create a readable file stream. */
  createReadStream: typeof createReadStream;
  /** Create a writable file stream. */
  createWriteStream: typeof createWriteStream;
  /** Join path segments. */
  join: typeof join;
  /** Create a directory synchronously. */
  mkdirSync: typeof mkdirSync;
  /** Wait for one event from an emitter. */
  once: typeof once;
  /** Read file metadata synchronously. */
  statSync: (path: string) => ExportLogFileStat;
}

const defaultDependencies: ExportCombinedLogsDependencies = {
  basename,
  createReadStream,
  createWriteStream,
  join,
  mkdirSync,
  once,
  statSync,
};

/**
 * Choose the best source file for a given kind, with safe fallbacks:
 *  - error: prefer errorPath → fallback to errPath
 *  - warn:  prefer warnPath  → fallback to errPath
 *  - info:  prefer infoPath  → fallback to outPath
 *
 * @param kind - The kind of log to pick
 * @param p - The worker log paths
 * @returns The best source path for the given kind, or undefined if not available
 */
function pickSourcePath(kind: Exclude<LogKind, 'all'>, p: WorkerLogPaths): string | undefined {
  if (kind === 'error') return p.errorPath || p.errPath;
  if (kind === 'warn') return p.warnPath || p.errPath;
  // kind === 'info'
  return p.infoPath || p.outPath;
}

/**
 * Combine all worker logs of the given kind into a single file.
 * Writes simple headers per worker and concatenates in worker-id order.
 *
 * @param slotLogPaths - Map of workerId -> WorkerLogPaths
 * @param kind - 'error' | 'warn' | 'info' | 'all'
 * @param outDir - directory to write the combined file
 * @param filename - optional override (default: combined-{kind}.log)
 * @param dependencies - File, path, and event operations used by the export.
 * @returns absolute path to the combined log file
 */
export async function exportCombinedLogs(
  slotLogPaths: SlotPaths,
  kind: LogKind,
  outDir: string,
  filename?: string,
  dependencies: ExportCombinedLogsDependencies = defaultDependencies,
): Promise<string> {
  dependencies.mkdirSync(outDir, { recursive: true });

  const outPath = dependencies.join(outDir, filename ?? `combined-${kind}.log`);
  const out = dependencies.createWriteStream(outPath, { flags: 'w' });

  for (const [id, pathsMaybe] of [...slotLogPaths.entries()].sort((a, b) => a[0] - b[0])) {
    if (!pathsMaybe) continue;
    const p = pathsMaybe as WorkerLogPaths;

    // Worker header
    out.write(`\n==== worker ${id} ====\n`);

    if (kind === 'all') {
      // Concatenate stdout, stderr, and structured (if present)
      const sources: Array<{
        /** Label */
        label: string;
        /** Path */
        path?: string;
      }> = [
        { label: 'stdout', path: p.outPath },
        { label: 'stderr', path: p.errPath },
        { label: 'structured', path: p.structuredPath },
      ];

      for (const { label, path } of sources) {
        out.write(`\n---- ${label}${path ? ` (${dependencies.basename(path)})` : ''} ----\n`);
        if (!path) {
          out.write('[unavailable]\n');
          continue;
        }
        try {
          const st = dependencies.statSync(path);
          if (st.size === 0) {
            out.write('[empty]\n');
            continue;
          }
          const rs = dependencies.createReadStream(path, { encoding: 'utf8' });
          rs.pipe(out, { end: false });
          await dependencies.once(rs, 'end');
        } catch {
          out.write(`[unavailable: ${path}]\n`);
        }
      }
      continue;
    }

    // error / warn / info (single best source with fallback)
    const srcPath = pickSourcePath(kind, p);
    out.write(`(${srcPath ? dependencies.basename(srcPath) : 'unavailable'})\n`);

    if (!srcPath) {
      out.write('[unavailable]\n');
      continue;
    }

    try {
      const st = dependencies.statSync(srcPath);
      if (st.size === 0) {
        out.write('[empty]\n');
        continue;
      }
      const rs = dependencies.createReadStream(srcPath, { encoding: 'utf8' });
      rs.pipe(out, { end: false });
      await dependencies.once(rs, 'end');
    } catch {
      // skip unreadable files
      out.write(`[unavailable: ${srcPath}]\n`);
    }
  }

  await new Promise<void>((r) => {
    out.end(r);
  });
  return outPath;
}
/* eslint-enable no-continue */
