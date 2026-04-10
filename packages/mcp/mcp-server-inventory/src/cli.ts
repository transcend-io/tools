#!/usr/bin/env node
import { createMCPServer } from '@transcend-io/mcp-server-core';

import { InventoryMixin } from './graphql.js';
import { getInventoryTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-inventory',
  version: '1.0.0',
  getTools: getInventoryTools,
  createClients: (apiKey, graphqlUrl) => ({
    graphql: new InventoryMixin(apiKey, graphqlUrl),
  }),
});
