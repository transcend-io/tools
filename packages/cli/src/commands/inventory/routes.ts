import { buildRouteMap } from '@stricli/core';

import { consentManagerServiceJsonToYmlCommand } from './consent-manager-service-json-to-yml/command.js';
import { consentManagersToBusinessEntitiesCommand } from './consent-managers-to-business-entities/command.js';
import { deriveDataSilosFromDataFlowsCrossInstanceCommand } from './derive-data-silos-from-data-flows-cross-instance/command.js';
import { deriveDataSilosFromDataFlowsCommand } from './derive-data-silos-from-data-flows/command.js';
import { discoverSilosCommand } from './discover-silos/command.js';
import { pullDatapointsCommand } from './pull-datapoints/command.js';
import { pullUnstructuredDiscoveryFilesCommand } from './pull-unstructured-discovery-files/command.js';
import { pullCommand } from './pull/command.js';
import { pushCommand } from './push/command.js';
import { scanPackagesCommand } from './scan-packages/command.js';

export const inventoryRoutes = buildRouteMap({
  routes: {
    pull: pullCommand,
    push: pushCommand,
    'scan-packages': scanPackagesCommand,
    'discover-silos': discoverSilosCommand,
    'pull-datapoints': pullDatapointsCommand,
    'pull-unstructured-discovery-files': pullUnstructuredDiscoveryFilesCommand,
    'derive-data-silos-from-data-flows': deriveDataSilosFromDataFlowsCommand,
    'derive-data-silos-from-data-flows-cross-instance':
      deriveDataSilosFromDataFlowsCrossInstanceCommand,
    'consent-manager-service-json-to-yml': consentManagerServiceJsonToYmlCommand,
    'consent-managers-to-business-entities': consentManagersToBusinessEntitiesCommand,
  },
  docs: {
    brief: 'Inventory commands',
  },
});
