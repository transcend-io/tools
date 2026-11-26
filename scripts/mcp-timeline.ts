/**
 * Prints what a Transcend MCP server did, from its debug log.
 *
 * Turn the log on by setting `TRANSCEND_MCP_LOG_FILE` to a file path for the server
 * process. The server then appends one JSON line per event. This script reads that
 * file and prints one line per tool call: the summary step, the approval form, the
 * answer, the handler, and how the call ended.
 *
 * Usage:
 *   pnpm mcp:timeline <log file>               # one line per tool call
 *   pnpm mcp:timeline <log file> --ref 1a2b3c4d  # every event of one call
 *
 * The ref is the `Ref:` line at the bottom of an approval form while logging is on.
 * Without a file argument the script reads `TRANSCEND_MCP_LOG_FILE`.
 */

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { formatMcpTimeline } from '../packages/mcp/mcp-server-base/src/debug-timeline.ts';
import { logger } from './logger.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { ref: { type: 'string' } },
});

const file = positionals[0] ?? process.env.TRANSCEND_MCP_LOG_FILE;
if (!file) {
  logger.error('Pass a log file, or set TRANSCEND_MCP_LOG_FILE.');
  process.exit(1);
}

logger.log(formatMcpTimeline(readFileSync(file, 'utf8'), { ref: values.ref }));
