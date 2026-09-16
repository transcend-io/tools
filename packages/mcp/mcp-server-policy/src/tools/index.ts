import type { ToolClients, ToolDefinition } from '@transcend-io/mcp-server-base';

import { type PolicyToolClients } from '../helpers/policyContext.js';
import { createPolicyGetTemplatesTool } from './policy_get_templates.js';
import { createPolicyListBundlesTool } from './policy_list_bundles.js';

export function getPolicyTools(clients: ToolClients | PolicyToolClients): ToolDefinition[] {
  const policyClients = clients as PolicyToolClients;
  return [createPolicyGetTemplatesTool(policyClients), createPolicyListBundlesTool(policyClients)];
}
