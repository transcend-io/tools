#!/usr/bin/env node
import { createMCPServer, createTranscendRestClient } from '@transcend-io/mcp-server-base';
import { TranscendMcpServer, getMcpServerOAuthScopes } from '@transcend-io/sdk';

import packageJson from '../package.json' with { type: 'json' };
import { DSRMixin } from './graphql.js';
import { getDsrPrompts } from './prompts/index.js';
import { getDSRTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-dsr',
  version: packageJson.version,
  oauthScopes: getMcpServerOAuthScopes(TranscendMcpServer.Dsr),
  getTools: getDSRTools,
  getPrompts: getDsrPrompts,
  createClients: ({
    auth,
    sombraUrl,
    sombraCustomerKey,
    requireMultiTenantSombra,
    graphqlUrl,
    dashboardUrl,
  }) => {
    const graphql = new DSRMixin(auth, graphqlUrl);
    return {
      rest: createTranscendRestClient(auth, graphql, {
        sombraUrl,
        sombraCustomerKey,
        requireMultiTenantSombra,
      }),
      graphql,
      dashboardUrl,
    };
  },
});
