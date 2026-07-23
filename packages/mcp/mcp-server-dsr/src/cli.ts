#!/usr/bin/env node
import { createMCPServer, createTranscendRestClient } from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { DSRMixin } from './graphql.js';
import { DSR_OAUTH_SCOPES } from './scopes.js';
import { getDSRTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-dsr',
  version: packageJson.version,
  oauthScopes: DSR_OAUTH_SCOPES,
  getTools: getDSRTools,
  createClients: ({ auth, sombraUrl, sombraCustomerKey, graphqlUrl, dashboardUrl }) => {
    const graphql = new DSRMixin(auth, graphqlUrl);
    return {
      rest: createTranscendRestClient(auth, graphql, { sombraUrl, sombraCustomerKey }),
      graphql,
      dashboardUrl,
    };
  },
});
