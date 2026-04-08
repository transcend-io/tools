#!/usr/bin/env node
import { createMCPServer, TranscendRestClient } from '@transcend-io/mcp-server-core';

import { WorkflowsMixin } from './graphql.js';
import { getWorkflowTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-workflows',
  version: '1.0.0',
  getTools: getWorkflowTools,
  createClients: (apiKey, sombraUrl, graphqlUrl) => ({
    rest: new TranscendRestClient(apiKey, sombraUrl),
    graphql: new WorkflowsMixin(apiKey, graphqlUrl),
  }),
});
