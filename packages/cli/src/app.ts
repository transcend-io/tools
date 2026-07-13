import { buildInstallCommand, buildUninstallCommand } from '@stricli/auto-complete';
import { buildApplication, buildRouteMap, text_en } from '@stricli/core';

import { adminRoutes } from './commands/admin/routes.js';
import { consentRoutes } from './commands/consent/routes.js';
import { inventoryRoutes } from './commands/inventory/routes.js';
import { migrationRoutes } from './commands/migration/routes.js';
import { formatCliException } from './commands/policy/helpers/policyEngineCliError.js';
import { policyRoutes } from './commands/policy/routes.js';
import { requestRoutes } from './commands/request/routes.js';
import { description, name, version } from './constants.js';

const routes = buildRouteMap({
  routes: {
    request: requestRoutes,
    consent: consentRoutes,
    inventory: inventoryRoutes,
    admin: adminRoutes,
    migration: migrationRoutes,
    policy: policyRoutes,
    install: buildInstallCommand('@transcend-io/transcend', {
      bash: '__@transcend-io/cli_bash_complete',
    }),
    uninstall: buildUninstallCommand('@transcend-io/transcend', { bash: true }),
  },
  docs: {
    brief: description,
    hideRoute: {
      install: true,
      uninstall: true,
    },
  },
});

export const app = buildApplication(routes, {
  name,
  versionInfo: {
    currentVersion: version,
  },
  localization: {
    loadText: (locale) => {
      if (!locale.startsWith('en')) {
        return undefined;
      }

      return {
        ...text_en,
        formatException: formatCliException,
      };
    },
  },
});
