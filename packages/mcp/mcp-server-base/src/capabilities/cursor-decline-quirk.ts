/**
 * Cursor's elicitation implementation is bugged when having multiple windows
 * open: the MCP bridge is hosted on one of the windows, causing elicitation to
 * fall through and fast decline under 250ms. This is a HACK to let a prompt
 * fall back to another route on Cursor.
 *
 * Its own log shows the drop and the decline a millisecond apart:
 *
 *   WARN [McpProcessMain] Cannot route MCP lease elicitation request for
 *   window 6 in window 4
 *   WARN Host declined the confirmation for preferences_delete_identifiers in
 *   2ms, too fast to have shown it to anybody
 *
 * TODO: https://linear.app/transcend/issue/ZEL-8311 - remove when Cursor's
 * multi-window elicitation support is ready.
 *
 * Deleting this file is the whole removal. Its callers are the decline branches
 * of the confirmation gate and of the sign-in prompt, and
 * `UnaskedReason.Undelivered` plus the `HOST_QUIRKS` entry go with it.
 */

import { SimpleLogger } from '../clients/graphql/base.js';
import { getMcpSession } from '../mcp-session-context.js';
import { quirksFor } from './client-detection.js';
import { McpHostClient } from './types.js';

const logger = new SimpleLogger();

/**
 * Floor threshold when something is considered a human response.
 */
export const HUMAN_RESPONSE_FLOOR_MS = 250;

/**
 * Derive if decline came from an undelivered prompt. Cursor rejects elicitation
 * during callers prompt, so we need to check if the decline is too fast to have
 * shown it to anybody.
 */
export function declineCameFromUndeliveredPrompt(
  /** What the host was asked, for the log line */
  prompt: string,
  /** How long the host took to answer */
  elapsedMs: number,
): boolean {
  if (elapsedMs >= HUMAN_RESPONSE_FLOOR_MS) return false;

  const session = getMcpSession();
  // Check if the host is Cursor, if so, return true so the caller takes its fallback.
  const host = session?.client.host ?? McpHostClient.Unknown;
  if (quirksFor(host).mayDeclineWithoutAsking !== true) return false;

  logger.warn(
    `Host declined ${prompt} in ${elapsedMs}ms, too fast to have shown it to anybody; ` +
      'falling back to asking through the caller instead',
    { host, clientName: session?.client.clientInfo?.name, elapsed: elapsedMs },
  );
  return true;
}
