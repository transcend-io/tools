#!/usr/bin/env node
import { createMCPServer, createTranscendRestClient } from '@transcend-io/mcp-server-base';
import { TranscendMcpServer, getMcpServerOAuthScopes } from '@transcend-io/sdk';

import packageJson from '../package.json' with { type: 'json' };
import { DiscoveryMixin } from './graphql.js';
import { getDiscoveryTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-discovery',
  version: packageJson.version,
  oauthScopes: getMcpServerOAuthScopes(TranscendMcpServer.Discovery),
  getTools: getDiscoveryTools,
  createClients: ({
    auth,
    sombraUrl,
    sombraCustomerKey,
    requireMultiTenantSombra,
    graphqlUrl,
    dashboardUrl,
  }) => {
    const graphql = new DiscoveryMixin(auth, graphqlUrl);
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
