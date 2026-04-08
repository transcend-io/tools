#!/usr/bin/env node
import { createMCPServer, TranscendRestClient } from '@transcend-io/mcp-server-core';

import { DSRMixin } from './graphql.js';
import { getDSRTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-dsr',
  version: '1.0.0',
  getTools: getDSRTools,
  createClients: (apiKey, sombraUrl, graphqlUrl) => ({
    rest: new TranscendRestClient(apiKey, sombraUrl),
    graphql: new DSRMixin(apiKey, graphqlUrl),
  }),
});
