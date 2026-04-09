import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-core';

import { createConsentBulkTriageTool } from './consent_bulk_triage.js';
import { createConsentGetPreferencesTool } from './consent_get_preferences.js';
import { createConsentGetTriageStatsTool } from './consent_get_triage_stats.js';
import { createConsentListAirgapBundlesTool } from './consent_list_airgap_bundles.js';
import { createConsentListCookiesTool } from './consent_list_cookies.js';
import { createConsentListDataFlowsTool } from './consent_list_data_flows.js';
import { createConsentListPurposesTool } from './consent_list_purposes.js';
import { createConsentListRegimesTool } from './consent_list_regimes.js';
import { createConsentSetPreferencesTool } from './consent_set_preferences.js';
import { createConsentUpdateCookiesTool } from './consent_update_cookies.js';
import { createConsentUpdateDataFlowsTool } from './consent_update_data_flows.js';

export function getConsentTools(clients: ToolClients): ToolDefinition[] {
  return [
    createConsentGetPreferencesTool(clients),
    createConsentSetPreferencesTool(clients),
    createConsentListPurposesTool(clients),
    createConsentListDataFlowsTool(clients),
    createConsentListCookiesTool(clients),
    createConsentListAirgapBundlesTool(clients),
    createConsentListRegimesTool(clients),
    createConsentGetTriageStatsTool(clients),
    createConsentUpdateCookiesTool(clients),
    createConsentUpdateDataFlowsTool(clients),
    createConsentBulkTriageTool(clients),
  ];
}
