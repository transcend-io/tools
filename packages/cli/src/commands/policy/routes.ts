import { buildRouteMap } from '@stricli/core';

import { activateCommand } from './activate/command.js';
import { evalCommand } from './eval/command.js';
import { lintCommand } from './lint/command.js';
import { listCommand } from './list/command.js';
import { publishCommand } from './publish/command.js';
import { testCommand } from './test/command.js';

export const policyRoutes = buildRouteMap({
  routes: {
    activate: activateCommand,
    eval: evalCommand,
    lint: lintCommand,
    list: listCommand,
    publish: publishCommand,
    test: testCommand,
  },
  docs: {
    brief: 'Policy Engine commands',
  },
});
