import { buildRouteMap } from '@stricli/core';

import { pullIdentifiersCommand } from './pull-identifiers/command.js';
import { pushIdentifiersCommand } from './push-identifiers/command.js';

export const preflightRoutes = buildRouteMap({
  routes: {
    'pull-identifiers': pullIdentifiersCommand,
    'push-identifiers': pushIdentifiersCommand,
  },
  docs: {
    brief: 'Preflight commands',
  },
});
