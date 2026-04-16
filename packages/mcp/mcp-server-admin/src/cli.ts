#!/usr/bin/env node
import { createMCPServer } from '@transcend-io/mcp-server-core';

import { AdminMixin } from './graphql.js';
import { getAdminTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-admin',
  version: '1.0.0',
  getTools: getAdminTools,
  createClients: (apiKey, graphqlUrl) => ({
    graphql: new AdminMixin(apiKey, graphqlUrl),
  }),
});
