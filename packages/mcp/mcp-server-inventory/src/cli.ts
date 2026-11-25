#!/usr/bin/env node
import { createMCPServer, createTranscendRestClient } from '@transcend-io/mcp-server-base';
import { TranscendMcpServer, getMcpServerOAuthScopes } from '@transcend-io/sdk';

import packageJson from '../package.json' with { type: 'json' };
import { InventoryMixin } from './graphql.js';
import { getInventoryTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-inventory',
  version: packageJson.version,
  oauthScopes: getMcpServerOAuthScopes(TranscendMcpServer.Inventory),
  getTools: getInventoryTools,
  createClients: ({ auth, sombraUrl, sombraCustomerKey, graphqlUrl, dashboardUrl }) => {
    const graphql = new InventoryMixin(auth, graphqlUrl);
    return {
      rest: createTranscendRestClient(auth, graphql, { sombraUrl, sombraCustomerKey }),
      graphql,
      dashboardUrl,
    };
  },
});
