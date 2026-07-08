import type { Logger } from './logger.js';
import type { SyncLogEntry } from './syncResult.js';

/**
 * Create a logger that captures log entries for MCP debug responses
 *
 * @param options - Options
 * @returns Logger and collected entries
 */
export function createCollectingLogger(
  options: {
    /** Optional delegate logger (defaults to console) */
    delegate?: Logger;
  } = {},
): {
  /** Logger instance */
  logger: Logger;
  /** Collected log entries */
  logs: SyncLogEntry[];
} {
  const delegate = options.delegate ?? console;
  const logs: SyncLogEntry[] = [];

  const append = (level: SyncLogEntry['level'], args: unknown[]): void => {
    const message = args
      .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
      .join(' ');
    logs.push({ level, message });
    delegate[level](...args);
  };

  const logger: Logger = {
    info: (...args: unknown[]) => append('info', args),
    warn: (...args: unknown[]) => append('warn', args),
    error: (...args: unknown[]) => append('error', args),
    debug: (...args: unknown[]) => append('debug', args),
  };

  return { logger, logs };
}
