import { buildRouteMap } from '@stricli/core';

import { checkCommand } from './check/command.js';
import { initCommand } from './init/command.js';
import { listCommand } from './list/command.js';
import { newCommand } from './new/command.js';
import { pushCommand } from './push/command.js';
import { runCommand } from './run/command.js';

export const customFunctionsRoutes = buildRouteMap({
  routes: {
    init: initCommand,
    new: newCommand,
    check: checkCommand,
    run: runCommand,
    push: pushCommand,
    list: listCommand,
  },
  docs: {
    brief: 'Manage custom function code from your own repository',
  },
});
