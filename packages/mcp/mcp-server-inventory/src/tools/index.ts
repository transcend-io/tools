import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-core';

import { createInventoryAnalyzeTool } from './inventory_analyze.js';
import { createInventoryCreateDataSiloTool } from './inventory_create_data_silo.js';
import { createInventoryGetDataSiloTool } from './inventory_get_data_silo.js';
import { createInventoryListCategoriesTool } from './inventory_list_categories.js';
import { createInventoryListDataPointsTool } from './inventory_list_data_points.js';
import { createInventoryListDataSilosTool } from './inventory_list_data_silos.js';
import { createInventoryListIdentifiersTool } from './inventory_list_identifiers.js';
import { createInventoryListSubDataPointsTool } from './inventory_list_sub_data_points.js';
import { createInventoryListVendorsTool } from './inventory_list_vendors.js';
import { createInventoryUpdateDataSiloTool } from './inventory_update_data_silo.js';

export function getInventoryTools(clients: ToolClients): ToolDefinition[] {
  return [
    createInventoryListDataSilosTool(clients),
    createInventoryGetDataSiloTool(clients),
    createInventoryCreateDataSiloTool(clients),
    createInventoryUpdateDataSiloTool(clients),
    createInventoryListVendorsTool(clients),
    createInventoryListDataPointsTool(clients),
    createInventoryListSubDataPointsTool(clients),
    createInventoryListIdentifiersTool(clients),
    createInventoryListCategoriesTool(clients),
    createInventoryAnalyzeTool(clients),
  ];
}
