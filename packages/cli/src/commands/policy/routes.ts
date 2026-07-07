import { buildRouteMap } from '@stricli/core';

import { activateCommand } from './activate/command.js';
import { bundlesCommand } from './bundles/command.js';
import { deactivateCommand } from './deactivate/command.js';
import { evalCommand } from './eval/command.js';
import { lintCommand } from './lint/command.js';
import { publishCommand } from './publish/command.js';
import { testCommand } from './test/command.js';
import { versionsCommand } from './versions/command.js';

export const policyRoutes = buildRouteMap({
  routes: {
    activate: activateCommand,
    deactivate: deactivateCommand,
    eval: evalCommand,
    lint: lintCommand,
    bundles: bundlesCommand,
    publish: publishCommand,
    test: testCommand,
    versions: versionsCommand,
  },
  docs: {
    brief: 'Policy Engine commands',
  },
});
