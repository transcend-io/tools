import { buildRouteMap } from '@stricli/core';

import { activateCommand } from './activate/command.js';
import { evalCommand } from './eval/command.js';
import { lintCommand } from './lint/command.js';
import { listCommand } from './list/command.js';
import { publishCommand } from './publish/command.js';
import { testCommand } from './test/command.js';

export const policyRoutes = buildRouteMap({
  routes: {
    lint: lintCommand,
    test: testCommand,
    eval: evalCommand,
    publish: publishCommand,
    activate: activateCommand,
    list: listCommand,
  },
  docs: {
    brief: 'Policy Engine commands',
  },
});
