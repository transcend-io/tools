/** Options for printing CLI command output. */
export interface PrintResultOptions {
  /** When true, print raw JSON */
  json: boolean;
  /** JSON-serializable payload */
  data: unknown;
  /** Table renderer used when json is false */
  renderTable?: () => string;
}

/**
 * Prints JSON or a human-readable table to stdout.
 *
 * @param stdout - Process stdout stream
 * @param options - Output options
 */
export function printResult(stdout: NodeJS.WriteStream, options: PrintResultOptions): void {
  if (options.json) {
    stdout.write(`${JSON.stringify(options.data, null, 2)}\n`);
    return;
  }

  if (options.renderTable) {
    stdout.write(`${options.renderTable()}\n`);
  }
}
