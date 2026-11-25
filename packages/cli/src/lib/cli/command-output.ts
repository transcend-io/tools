import type { CliLogger } from '../../context.js';

/** Logger that keeps machine-readable stdout free of human progress messages. */
const SILENT_COMMAND_LOGGER: CliLogger = {
  debug: () => undefined,
  error: () => undefined,
  info: () => undefined,
  log: () => undefined,
  warn: () => undefined,
};

/**
 * Select the logger for a human-readable or machine-readable invocation.
 *
 * @param logger - Normal command logger
 * @param json - Whether stdout is reserved for JSON
 * @returns Normal or silent command logger
 */
export function selectCommandLogger(logger: CliLogger, json: boolean): CliLogger {
  return json ? SILENT_COMMAND_LOGGER : logger;
}
