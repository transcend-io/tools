import { buildRouteMap } from '@stricli/core';

import { evalCommand } from './eval/command.js';
import { lintCommand } from './lint/command.js';
import { publishCommand } from './publish/command.js';
import { testCommand } from './test/command.js';

export const policyRoutes = buildRouteMap({
  routes: {
    eval: evalCommand,
    lint: lintCommand,
    publish: publishCommand,
    test: testCommand,
  },
  docs: {
    brief: 'Policy Engine commands',
  },
});
