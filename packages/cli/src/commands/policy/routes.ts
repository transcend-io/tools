import { buildRouteMap } from '@stricli/core';

import { lintCommand } from './lint/command.js';
import { testCommand } from './test/command.js';

export const policyRoutes = buildRouteMap({
  routes: {
    lint: lintCommand,
    test: testCommand,
  },
  docs: {
    brief: 'Policy Engine commands',
  },
});
