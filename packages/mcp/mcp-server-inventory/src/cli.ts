#!/usr/bin/env node
import { createMCPServer, createTranscendRestClient } from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { InventoryMixin } from './graphql.js';
import { INVENTORY_OAUTH_SCOPES } from './scopes.js';
import { getInventoryTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-inventory',
  version: packageJson.version,
  oauthScopes: INVENTORY_OAUTH_SCOPES,
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
