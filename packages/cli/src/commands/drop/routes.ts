import { buildRouteMap } from '@stricli/core';

import { uploadCommand } from './upload/command.js';

export const dropRoutes = buildRouteMap({
  routes: {
    upload: uploadCommand,
  },
  docs: {
    brief: 'Commands for the California DROP (DELETE Act) workflow',
  },
});
