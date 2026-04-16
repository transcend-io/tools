#!/usr/bin/env node
import { createMCPServer } from '@transcend-io/mcp-server-core';

import { DiscoveryMixin } from './graphql.js';
import { getDiscoveryTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-discovery',
  version: '1.0.0',
  getTools: getDiscoveryTools,
  createClients: (apiKey, graphqlUrl) => ({
    graphql: new DiscoveryMixin(apiKey, graphqlUrl),
  }),
});
