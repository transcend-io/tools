import type { ToolClients, ToolDefinition } from '@transcend-io/mcp-server-base';

import { type PolicyToolClients } from '../helpers/policyContext.js';

/**
 * Policy Engine tools. Read/write tools land in follow-up PRs; scaffold returns none.
 */
export function getPolicyTools(_clients: ToolClients | PolicyToolClients): ToolDefinition[] {
  return [];
}
