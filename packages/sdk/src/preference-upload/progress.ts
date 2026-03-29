import type { PreferenceUploadProgress } from '../preference-management/types.js';

/** Per-file summary emitted when a file finishes processing */
export interface FileProgressInfo {
  /** File path or identifier */
  file: string;
  /** Number of safe (non-conflicting) records uploaded */
  safeCount: number;
  /** Number of conflicting records uploaded */
  conflictCount: number;
  /** Number of records skipped (already in sync) */
  skippedCount: number;
  /** Number of records that failed to upload */
  failedCount: number;
  /** Total records in the file */
  totalRecords: number;
}

/**
 * Structured progress reporting interface for preference uploads.
 *
 * Consumers implement this to receive machine-readable progress updates:
 * - CLI: writes receipts + updates terminal dashboard
 * - Container: writes progress.json for Retool, posts to Transcend API
 * - Agent: emits structured events
 */
export interface UploadProgressSink {
  /** Called when a file starts processing */
  onFileStart(file: string, totalRecords: number): void;
  /** Called periodically as records are uploaded */
  onFileProgress(file: string, progress: PreferenceUploadProgress): void;
  /** Called when a file finishes (success or partial) */
  onFileComplete(file: string, info: FileProgressInfo): void;
  /** Called on non-fatal errors (e.g. skipped identifier) */
  onError(file: string, error: string): void;
  /** Called when the entire job finishes */
  onJobComplete(summary: {
    /** Total files processed */
    totalFiles: number;
    /** Total records across all files */
    totalRecords: number;
    /** Wall-clock time in milliseconds */
    elapsedMs: number;
    /** Per-file summaries */
    filesCompleted: FileProgressInfo[];
  }): void;
}

/** No-op sink for when progress reporting isn't needed */
export const noopProgressSink: UploadProgressSink = {
  onFileStart: () => {},
  onFileProgress: () => {},
  onFileComplete: () => {},
  onError: () => {},
  onJobComplete: () => {},
};
