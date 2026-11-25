import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createPrivacyCenterGetTool } from './privacy_center_get.js';
import { createPrivacyCenterListIntlMessagesTool } from './privacy_center_list_intl_messages.js';
import { createPrivacyCenterListPoliciesTool } from './privacy_center_list_policies.js';
import { createPrivacyCenterWriteTool } from './privacy_center_write.js';
import { createPrivacyCenterWriteIntlMessagesTool } from './privacy_center_write_intl_messages.js';
import { createPrivacyCenterWritePoliciesTool } from './privacy_center_write_policies.js';

export function getPrivacyCenterTools(clients: ToolClients): ToolDefinition[] {
  return [
    createPrivacyCenterGetTool(clients),
    createPrivacyCenterWriteTool(clients),
    createPrivacyCenterListIntlMessagesTool(clients),
    createPrivacyCenterWriteIntlMessagesTool(clients),
    createPrivacyCenterListPoliciesTool(clients),
    createPrivacyCenterWritePoliciesTool(clients),
  ];
}
