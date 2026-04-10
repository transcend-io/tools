#!/usr/bin/env node
import { createMCPServer } from '@transcend-io/mcp-server-core';

import { DSRMixin } from './graphql.js';
import { getDSRTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-dsr',
  version: '1.0.0',
  getTools: getDSRTools,
  createClients: (apiKey, graphqlUrl) => ({
    graphql: new DSRMixin(apiKey, graphqlUrl),
  }),
});
