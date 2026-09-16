import type { ToolClients, ToolDefinition } from '@transcend-io/mcp-server-base';

import { type PolicyToolClients } from '../helpers/policyContext.js';
import { createPolicyGetTemplatesTool } from './policy_get_templates.js';
import { createPolicyStatusTool } from './policy_status.js';

export function getPolicyTools(clients: ToolClients | PolicyToolClients): ToolDefinition[] {
  const policyClients = clients as PolicyToolClients;
  return [createPolicyGetTemplatesTool(policyClients), createPolicyStatusTool(policyClients)];
}
