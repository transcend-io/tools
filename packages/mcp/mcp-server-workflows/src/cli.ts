#!/usr/bin/env node
import { createMCPServer } from '@transcend-io/mcp-server-core';

import { WorkflowsMixin } from './graphql.js';
import { getWorkflowTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-workflows',
  version: '1.0.0',
  getTools: getWorkflowTools,
  createClients: (apiKey, graphqlUrl) => ({
    graphql: new WorkflowsMixin(apiKey, graphqlUrl),
  }),
});
