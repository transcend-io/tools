#!/usr/bin/env node
import { createMCPServer, TranscendRestClient } from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { DiscoveryMixin } from './graphql.js';
import { DISCOVERY_OAUTH_SCOPES } from './scopes.js';
import { getDiscoveryTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-discovery',
  version: packageJson.version,
  oauthScopes: DISCOVERY_OAUTH_SCOPES,
  getTools: getDiscoveryTools,
  createClients: ({ auth, sombraUrl, graphqlUrl, dashboardUrl }) => ({
    rest: new TranscendRestClient(auth, sombraUrl),
    graphql: new DiscoveryMixin(auth, graphqlUrl),
    dashboardUrl,
  }),
});
