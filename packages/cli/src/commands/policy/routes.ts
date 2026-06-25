import { buildRouteMap } from '@stricli/core';

import { lintCommand } from './lint/command.js';

export const policyRoutes = buildRouteMap({
  routes: {
    lint: lintCommand,
  },
  docs: {
    brief: 'Policy Engine commands',
  },
});
