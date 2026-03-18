import { buildRouteMap } from '@stricli/core';

import { approveCommand } from './approve/command.js';
import { cancelCommand } from './cancel/command.js';
import { cronRoutes } from './cron/routes.js';
import { downloadFilesCommand } from './download-files/command.js';
import { enricherRestartCommand } from './enricher-restart/command.js';
import { exportCommand } from './export/command.js';
import { markSilentCommand } from './mark-silent/command.js';
import { notifyAdditionalTimeCommand } from './notify-additional-time/command.js';
import { preflightRoutes } from './preflight/routes.js';
import { rejectUnverifiedIdentifiersCommand } from './reject-unverified-identifiers/command.js';
import { restartCommand } from './restart/command.js';
import { skipPreflightJobsCommand } from './skip-preflight-jobs/command.js';
import { systemRoutes } from './system/routes.js';
import { uploadCommand } from './upload/command.js';

export const requestRoutes = buildRouteMap({
  routes: {
    approve: approveCommand,
    upload: uploadCommand,
    'download-files': downloadFilesCommand,
    cancel: cancelCommand,
    restart: restartCommand,
    'notify-additional-time': notifyAdditionalTimeCommand,
    'mark-silent': markSilentCommand,
    'enricher-restart': enricherRestartCommand,
    'reject-unverified-identifiers': rejectUnverifiedIdentifiersCommand,
    export: exportCommand,
    'skip-preflight-jobs': skipPreflightJobsCommand,
    system: systemRoutes,
    preflight: preflightRoutes,
    cron: cronRoutes,
  },
  docs: {
    brief: 'All commands related to DSR requests',
  },
});
