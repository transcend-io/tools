#!/usr/bin/env node
import { createMCPServer, createTranscendRestClient } from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { DocsCatalogMixin } from './catalogGraphql.js';
import { getDocsTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-docs',
  version: packageJson.version,
  requireStartupAuth: false,
  // docs_integration_lookup reads the catalog, which needs sign-in but no scope.
  oauthScopes: [],
  getTools: getDocsTools,
  createClients: ({ auth, sombraUrl, sombraCustomerKey, graphqlUrl, dashboardUrl }) => {
    const graphql = new DocsCatalogMixin(auth, graphqlUrl);
    return {
      rest: createTranscendRestClient(auth, graphql, { sombraUrl, sombraCustomerKey }),
      graphql,
      dashboardUrl,
    };
  },
});
