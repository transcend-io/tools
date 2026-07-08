#!/usr/bin/env node
import { createMCPServer, TranscendRestClient } from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { AdminMixin } from './graphql.js';
import { ADMIN_OAUTH_SCOPES } from './scopes.js';
import { getAdminTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-admin',
  version: packageJson.version,
  oauthScopes: ADMIN_OAUTH_SCOPES,
  getTools: getAdminTools,
  createClients: ({ auth, sombraUrl, graphqlUrl, dashboardUrl }) => ({
    rest: new TranscendRestClient(auth, sombraUrl),
    graphql: new AdminMixin(auth, graphqlUrl),
    dashboardUrl,
  }),
});
