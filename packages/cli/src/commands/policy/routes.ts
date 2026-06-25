import { buildRouteMap } from '@stricli/core';

import { evalCommand } from './eval/command.js';
import { lintCommand } from './lint/command.js';
import { publishCommand } from './publish/command.js';
import { testCommand } from './test/command.js';

export const policyRoutes = buildRouteMap({
  routes: {
    lint: lintCommand,
    test: testCommand,
    eval: evalCommand,
    publish: publishCommand,
  },
  docs: {
    brief: 'Policy Engine commands',
  },
});
