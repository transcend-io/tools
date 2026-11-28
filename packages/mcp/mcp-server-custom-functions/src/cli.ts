#!/usr/bin/env node
import { createMCPServer, createTranscendRestClient } from '@transcend-io/mcp-server-base';
import { TranscendMcpServer, getMcpServerOAuthScopes } from '@transcend-io/sdk';

import packageJson from '../package.json' with { type: 'json' };
import { CustomFunctionsMixin } from './graphql.js';
import { getCustomFunctionsTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-custom-functions',
  version: packageJson.version,
  oauthScopes: getMcpServerOAuthScopes(TranscendMcpServer.CustomFunctions),
  getTools: getCustomFunctionsTools,
  createClients: ({
    auth,
    sombraUrl,
    sombraCustomerKey,
    requireMultiTenantSombra,
    graphqlUrl,
    dashboardUrl,
  }) => {
    const graphql = new CustomFunctionsMixin(auth, graphqlUrl);
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
