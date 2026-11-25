/**
 * Cursor's elicitation implementation is bugged when having multiple windows
 * open: the MCP bridge is hosted on one of the windows, causing elicitation to
 * fall through and fast decline under 250ms. This is a HACK to allow confirmation
 * behavior for Cursor.
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
 * Deleting this file is the whole removal. Its only caller is the decline branch
 * of the gate, and `UnaskedReason.Undelivered` plus the `HOST_QUIRKS` entry go
 * with it.
 */

import { quirksFor } from '../../capabilities/client-detection.js';
import { McpHostClient } from '../../capabilities/types.js';
import { SimpleLogger } from '../../clients/graphql/base.js';
import { getMcpSession } from '../../mcp-session-context.js';

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
  /** Tool being gated, for the log line */
  toolName: string,
  /** How long the host took to answer */
  elapsedMs: number,
  /** Whether an approval token can carry the decision instead */
  softConfirmationAvailable: boolean,
): boolean {
  if (!softConfirmationAvailable || elapsedMs >= HUMAN_RESPONSE_FLOOR_MS) return false;

  const session = getMcpSession();
  // Check if the host is Cursor, if so, return true to allow confirmation behavior for Cursor.
  const host = session?.client.host ?? McpHostClient.Unknown;
  if (quirksFor(host).mayDeclineWithoutAsking !== true) return false;

  logger.warn(
    `Host declined the confirmation for ${toolName} in ${elapsedMs}ms, too fast to have ` +
      'shown it to anybody; asking for approval through the caller instead',
    { host, clientName: session?.client.clientInfo?.name, elapsed: elapsedMs },
  );
  return true;
}
