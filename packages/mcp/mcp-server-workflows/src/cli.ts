#!/usr/bin/env node
import { createMCPServer, TranscendRestClient } from '@transcend-io/mcp-server-base';

import { WorkflowsMixin } from './graphql.js';
import { getWorkflowTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-workflows',
  version: '1.0.0',
  getTools: getWorkflowTools,
  createClients: (auth, sombraUrl, graphqlUrl) => ({
    rest: new TranscendRestClient(auth, sombraUrl),
    graphql: new WorkflowsMixin(auth, graphqlUrl),
  }),
});
