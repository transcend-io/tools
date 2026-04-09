import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-core';

import { createConsentBulkTriageTool } from './consent_bulk_triage.js';
import { createConsentGetPreferencesTool } from './consent_get_preferences.js';
import { createConsentGetTriageStatsTool } from './consent_get_triage_stats.js';
import { createConsentListAirgapBundlesTool } from './consent_list_airgap_bundles.js';
import { createConsentListDataFlowsTool } from './consent_list_data_flows.js';
import { createConsentListPurposesTool } from './consent_list_purposes.js';
import { createConsentListRegimesTool } from './consent_list_regimes.js';
import { createConsentListTriageCookiesTool } from './consent_list_triage_cookies.js';
import { createConsentListTriageDataFlowsTool } from './consent_list_triage_data_flows.js';
import { createConsentSetPreferencesTool } from './consent_set_preferences.js';
import { createConsentUpdateCookiesTool } from './consent_update_cookies.js';
import { createConsentUpdateDataFlowsTool } from './consent_update_data_flows.js';

export function getConsentTools(clients: ToolClients): ToolDefinition[] {
  return [
    createConsentGetPreferencesTool(clients),
    createConsentSetPreferencesTool(clients),
    createConsentListPurposesTool(clients),
    createConsentListDataFlowsTool(clients),
    createConsentListAirgapBundlesTool(clients),
    createConsentListRegimesTool(clients),
    createConsentListTriageCookiesTool(clients),
    createConsentListTriageDataFlowsTool(clients),
    createConsentGetTriageStatsTool(clients),
    createConsentUpdateCookiesTool(clients),
    createConsentUpdateDataFlowsTool(clients),
    createConsentBulkTriageTool(clients),
  ];
}
