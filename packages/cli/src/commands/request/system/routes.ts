import { buildRouteMap } from '@stricli/core';

import { markRequestDataSilosCompletedCommand } from './mark-request-data-silos-completed/command.js';
import { retryRequestDataSilosCommand } from './retry-request-data-silos/command.js';
import { skipRequestDataSilosCommand } from './skip-request-data-silos/command.js';

export const systemRoutes = buildRouteMap({
  routes: {
    'mark-request-data-silos-completed': markRequestDataSilosCompletedCommand,
    'retry-request-data-silos': retryRequestDataSilosCommand,
    'skip-request-data-silos': skipRequestDataSilosCommand,
  },
  docs: {
    brief: 'System commands',
  },
});
