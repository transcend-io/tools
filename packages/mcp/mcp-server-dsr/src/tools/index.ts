import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createDsrAnalyzeTool } from './dsr_analyze.js';
import { createDsrCancelTool } from './dsr_cancel.js';
import { createDsrDownloadKeysTool } from './dsr_download_keys.js';
import { createDsrEmployeeSubmitTool } from './dsr_employee_submit.js';
import { createDsrEnrichIdentifiersTool } from './dsr_enrich_identifiers.js';
import { createDsrGetDetailsTool } from './dsr_get_details.js';
import { createDsrListTool } from './dsr_list.js';
import { createDsrListIdentifiersTool } from './dsr_list_identifiers.js';
import { createDsrPollStatusTool } from './dsr_poll_status.js';
import { createDsrRespondAccessTool } from './dsr_respond_access.js';
import { createDsrRespondErasureTool } from './dsr_respond_erasure.js';
import { createDsrSubmitTool } from './dsr_submit.js';

export function getDSRTools(clients: ToolClients): ToolDefinition[] {
  return [
    createDsrSubmitTool(clients),
    createDsrPollStatusTool(clients),
    createDsrListTool(clients),
    createDsrGetDetailsTool(clients),
    createDsrDownloadKeysTool(clients),
    createDsrListIdentifiersTool(clients),
    createDsrEnrichIdentifiersTool(clients),
    createDsrRespondAccessTool(clients),
    createDsrRespondErasureTool(clients),
    createDsrCancelTool(clients),
    createDsrEmployeeSubmitTool(clients),
    createDsrAnalyzeTool(clients),
  ];
}
