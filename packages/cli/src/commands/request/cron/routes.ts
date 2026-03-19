import { buildRouteMap } from '@stricli/core';

import { markIdentifiersCompletedCommand } from './mark-identifiers-completed/command.js';
import { pullIdentifiersCommand } from './pull-identifiers/command.js';
import { pullProfilesCommand } from './pull-profiles/command.js';

export const cronRoutes = buildRouteMap({
  routes: {
    'pull-identifiers': pullIdentifiersCommand,
    'pull-profiles': pullProfilesCommand,
    'mark-identifiers-completed': markIdentifiersCompletedCommand,
  },
  docs: {
    brief: 'Cron commands',
    hideRoute: {
      'pull-profiles': true,
    },
  },
});
