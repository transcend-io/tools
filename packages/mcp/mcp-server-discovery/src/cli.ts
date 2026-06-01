#!/usr/bin/env node
import { createMCPServer, TranscendRestClient } from '@transcend-io/mcp-server-base';

import { DiscoveryMixin } from './graphql.js';
import { getDiscoveryTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-discovery',
  version: '1.0.0',
  getTools: getDiscoveryTools,
  createClients: ({ auth, sombraUrl, graphqlUrl, dashboardUrl }) => ({
    rest: new TranscendRestClient(auth, sombraUrl),
    graphql: new DiscoveryMixin(auth, graphqlUrl),
    dashboardUrl,
  }),
});
