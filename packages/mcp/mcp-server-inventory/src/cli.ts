#!/usr/bin/env node
import { createMCPServer, TranscendRestClient } from '@transcend-io/mcp-server-base';

import { InventoryMixin } from './graphql.js';
import { getInventoryTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-inventory',
  version: '1.0.0',
  getTools: getInventoryTools,
  createClients: ({ auth, sombraUrl, graphqlUrl, dashboardUrl }) => ({
    rest: new TranscendRestClient(auth, sombraUrl),
    graphql: new InventoryMixin(auth, graphqlUrl),
    dashboardUrl,
  }),
});
