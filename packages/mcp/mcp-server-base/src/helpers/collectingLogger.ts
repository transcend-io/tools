import type { Logger } from '../clients/graphql/base.js';

/** In-memory logger for MCP sync and push tools. */

/** Severity of a captured log line. */
export enum CollectedLogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

/** A captured log line. */
export interface CollectedLog {
  /** Severity */
  level: CollectedLogLevel;
  /** Message text */
  message: string;
}

/** Maximum lines kept, so a large sync cannot flood a tool result. */
const MAX_LOGS = 200;

/**
 * Logger that keeps lines in memory instead of printing.
 *
 * A stdio MCP server reserves stdout for protocol frames, so SDK output must not
 * reach it.
 *
 * @returns The logger and the lines it captured
 */
export function createCollectedLogger(): { logger: Logger; logs: CollectedLog[] } {
  const logs: CollectedLog[] = [];
  const add =
    (level: CollectedLogLevel) =>
    (...args: unknown[]): void => {
      if (level === CollectedLogLevel.Debug || logs.length >= MAX_LOGS) return;
      logs.push({
        level,
        message: args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '),
      });
    };
  return {
    logger: {
      debug: add(CollectedLogLevel.Debug),
      info: add(CollectedLogLevel.Info),
      warn: add(CollectedLogLevel.Warn),
      error: add(CollectedLogLevel.Error),
    },
    logs,
  };
}
