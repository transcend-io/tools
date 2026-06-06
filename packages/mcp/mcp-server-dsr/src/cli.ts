#!/usr/bin/env node
import { createMCPServer, TranscendRestClient } from '@transcend-io/mcp-server-base';

import { DSRMixin } from './graphql.js';
import { getDSRTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-dsr',
  version: '1.0.0',
  getTools: getDSRTools,
  createClients: ({ auth, sombraUrl, graphqlUrl, dashboardUrl }) => ({
    rest: new TranscendRestClient(auth, sombraUrl),
    graphql: new DSRMixin(auth, graphqlUrl),
    dashboardUrl,
  }),
});
