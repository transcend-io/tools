#!/usr/bin/env node
import { createMCPServer, TranscendRestClient } from '@transcend-io/mcp-server-core';

import { AdminMixin } from './graphql.js';
import { getAdminTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-admin',
  version: '1.0.0',
  getTools: getAdminTools,
  createClients: (auth, sombraUrl, graphqlUrl) => ({
    rest: new TranscendRestClient(auth, sombraUrl),
    graphql: new AdminMixin(auth, graphqlUrl),
  }),
});
