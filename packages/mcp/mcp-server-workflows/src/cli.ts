#!/usr/bin/env node
import { createMCPServer, TranscendRestClient } from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { WorkflowsMixin } from './graphql.js';
import { WORKFLOW_OAUTH_SCOPES } from './scopes.js';
import { getWorkflowTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-workflows',
  version: packageJson.version,
  oauthScopes: WORKFLOW_OAUTH_SCOPES,
  getTools: getWorkflowTools,
  createClients: ({ auth, sombraUrl, graphqlUrl, dashboardUrl }) => ({
    rest: new TranscendRestClient(auth, sombraUrl),
    graphql: new WorkflowsMixin(auth, graphqlUrl),
    dashboardUrl,
  }),
});
