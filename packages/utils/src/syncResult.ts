/** Structured sync error for a resource or item */
export interface SyncError {
  /** Resource key (e.g. purposes, attributes) */
  resource: string;
  /** Optional item identifier within the resource */
  item?: string;
  /** Error message */
  message: string;
}

/** Captured log entry from sync operations */
export interface SyncLogEntry {
  /** Log level */
  level: 'info' | 'warn' | 'error' | 'debug';
  /** Log message */
  message: string;
}

/** Structured result from syncConfigurationToTranscend */
export interface SyncResult {
  /** Whether sync completed without errors */
  success: boolean;
  /** Per-resource errors encountered during sync */
  errors: SyncError[];
  /** Non-fatal warnings (e.g. noop keys, unsupported fields) */
  warnings?: string[];
  /** Captured log lines when using a collecting logger */
  logs?: SyncLogEntry[];
}
