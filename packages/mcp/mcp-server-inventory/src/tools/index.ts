import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createInventoryAnalyzeTool } from './inventory_analyze.js';
import { createInventoryGetDataSiloTool } from './inventory_get_data_silo.js';
import { createInventoryListBusinessEntitiesTool } from './inventory_list_business_entities.js';
import { createInventoryListCatalogIntegrationsTool } from './inventory_list_catalog_integrations.js';
import { createInventoryListCategoriesTool } from './inventory_list_categories.js';
import { createInventoryListDataPointsTool } from './inventory_list_data_points.js';
import { createInventoryListDataSilosTool } from './inventory_list_data_silos.js';
import { createInventoryListDataSubjectsTool } from './inventory_list_data_subjects.js';
import { createInventoryListIdentifiersTool } from './inventory_list_identifiers.js';
import { createInventoryListProcessingPurposesTool } from './inventory_list_processing_purposes.js';
import { createInventoryListSubDataPointsTool } from './inventory_list_sub_data_points.js';
import { createInventoryListVendorsTool } from './inventory_list_vendors.js';
import { createInventoryUpdateOrCreateDataPointTool } from './inventory_update_or_create_data_point.js';
import { createInventoryWriteCategoryTool } from './inventory_write_category.js';
import { createInventoryWriteDataSiloTool } from './inventory_write_data_silo.js';
import { createInventoryWriteProcessingPurposeTool } from './inventory_write_processing_purpose.js';
import { createInventoryWriteVendorTool } from './inventory_write_vendor.js';

export function getInventoryTools(clients: ToolClients): ToolDefinition[] {
  return [
    createInventoryListDataSilosTool(clients),
    createInventoryGetDataSiloTool(clients),
    createInventoryListCatalogIntegrationsTool(clients),
    createInventoryWriteDataSiloTool(clients),
    createInventoryListVendorsTool(clients),
    createInventoryWriteVendorTool(clients),
    createInventoryListDataPointsTool(clients),
    createInventoryUpdateOrCreateDataPointTool(clients),
    createInventoryListSubDataPointsTool(clients),
    createInventoryListIdentifiersTool(clients),
    createInventoryListCategoriesTool(clients),
    createInventoryWriteCategoryTool(clients),
    createInventoryListProcessingPurposesTool(clients),
    createInventoryWriteProcessingPurposeTool(clients),
    createInventoryListBusinessEntitiesTool(clients),
    createInventoryListDataSubjectsTool(clients),
    createInventoryAnalyzeTool(clients),
  ];
}
