#!/usr/bin/env node
import { createMCPServer, createTranscendRestClient } from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { WorkflowsMixin } from './graphql.js';
import { WORKFLOW_OAUTH_SCOPES } from './scopes.js';
import { getWorkflowTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-workflows',
  version: packageJson.version,
  oauthScopes: WORKFLOW_OAUTH_SCOPES,
  getTools: getWorkflowTools,
  createClients: ({ auth, sombraUrl, sombraCustomerKey, graphqlUrl, dashboardUrl }) => {
    const graphql = new WorkflowsMixin(auth, graphqlUrl);
    return {
      rest: createTranscendRestClient(auth, graphql, { sombraUrl, sombraCustomerKey }),
      graphql,
      dashboardUrl,
    };
  },
});
