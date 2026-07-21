import { buildRouteMap } from '@stricli/core';

import { listCommand } from './list/command.js';
import { pushCommand } from './push/command.js';

export const customFunctionsRoutes = buildRouteMap({
  routes: {
    push: pushCommand,
    list: listCommand,
  },
  docs: {
    brief: 'Manage custom function code from your own repository',
  },
});
