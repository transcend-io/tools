#!/usr/bin/env node
import { createMCPServer, TranscendRestClient } from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { DSRMixin } from './graphql.js';
import { DSR_OAUTH_SCOPES } from './scopes.js';
import { getDSRTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-dsr',
  version: packageJson.version,
  oauthScopes: DSR_OAUTH_SCOPES,
  getTools: getDSRTools,
  createClients: ({ auth, sombraUrl, graphqlUrl, dashboardUrl }) => ({
    rest: new TranscendRestClient(auth, sombraUrl),
    graphql: new DSRMixin(auth, graphqlUrl),
    dashboardUrl,
  }),
});
