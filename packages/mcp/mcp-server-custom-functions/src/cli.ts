#!/usr/bin/env node
import { createMCPServer, createTranscendRestClient } from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { CustomFunctionsMixin } from './graphql.js';
import { CUSTOM_FUNCTIONS_OAUTH_SCOPES } from './scopes.js';
import { getCustomFunctionsTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-custom-functions',
  version: packageJson.version,
  oauthScopes: CUSTOM_FUNCTIONS_OAUTH_SCOPES,
  getTools: getCustomFunctionsTools,
  createClients: ({ auth, sombraUrl, sombraCustomerKey, graphqlUrl, dashboardUrl }) => {
    const graphql = new CustomFunctionsMixin(auth, graphqlUrl);
    return {
      rest: createTranscendRestClient(auth, graphql, { sombraUrl, sombraCustomerKey }),
      graphql,
      dashboardUrl,
    };
  },
});
