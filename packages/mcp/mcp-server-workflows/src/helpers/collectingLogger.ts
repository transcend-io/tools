import type { Logger } from '@transcend-io/mcp-server-base';

/** A captured log line. */
export interface CollectedLog {
  /** Severity */
  level: 'debug' | 'info' | 'warn' | 'error';
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
    (level: CollectedLog['level']) =>
    (...args: unknown[]): void => {
      if (level === 'debug' || logs.length >= MAX_LOGS) return;
      logs.push({
        level,
        message: args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '),
      });
    };
  return {
    logger: { debug: add('debug'), info: add('info'), warn: add('warn'), error: add('error') },
    logs,
  };
}
