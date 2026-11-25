#!/usr/bin/env node
import { createMCPServer, createTranscendRestClient } from '@transcend-io/mcp-server-base';
import { TranscendMcpServer, getMcpServerOAuthScopes } from '@transcend-io/sdk';

import packageJson from '../package.json' with { type: 'json' };
import { AssessmentsMixin } from './graphql.js';
import { getAssessmentTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-assessment',
  version: packageJson.version,
  oauthScopes: getMcpServerOAuthScopes(TranscendMcpServer.Assessment),
  getTools: getAssessmentTools,
  createClients: ({ auth, sombraUrl, sombraCustomerKey, graphqlUrl, dashboardUrl }) => {
    const graphql = new AssessmentsMixin(auth, graphqlUrl);
    return {
      rest: createTranscendRestClient(auth, graphql, { sombraUrl, sombraCustomerKey }),
      graphql,
      dashboardUrl,
    };
  },
});
