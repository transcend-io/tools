import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createDsrAnalyzeTool } from './dsr_analyze.js';
import { createDsrCancelTool } from './dsr_cancel.js';
import { createDsrEnrichIdentifiersTool } from './dsr_enrich_identifiers.js';
import { createDsrGetDetailsTool } from './dsr_get_details.js';
import { createDsrListTool } from './dsr_list.js';
import { createDsrListIdentifiersTool } from './dsr_list_identifiers.js';
import { createDsrListPendingRequestsTool } from './dsr_list_pending_requests.js';
import { createDsrListRequestDataSilosTool } from './dsr_list_request_data_silos.js';
import { createDsrPollStatusTool } from './dsr_poll_status.js';
import { createDsrSubmitTool } from './dsr_submit.js';

export function getDSRTools(clients: ToolClients): ToolDefinition[] {
  return [
    createDsrSubmitTool(clients),
    createDsrPollStatusTool(clients),
    createDsrListTool(clients),
    createDsrGetDetailsTool(clients),
    createDsrListIdentifiersTool(clients),
    createDsrListRequestDataSilosTool(clients),
    createDsrListPendingRequestsTool(clients),
    createDsrEnrichIdentifiersTool(clients),
    createDsrCancelTool(clients),
    createDsrAnalyzeTool(clients),
  ];
}
