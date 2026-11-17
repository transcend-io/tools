#!/usr/bin/env node
import {
  createMCPServer,
  createTranscendRestClient,
  TranscendGraphQLBase,
} from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { CONFIG_OAUTH_SCOPES } from './scopes.js';
import { getConfigTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-config',
  version: packageJson.version,
  oauthScopes: CONFIG_OAUTH_SCOPES,
  getTools: getConfigTools,
  createClients: ({ auth, sombraUrl, sombraCustomerKey, graphqlUrl, dashboardUrl }) => {
    const graphql = new TranscendGraphQLBase(auth, graphqlUrl);
    return {
      rest: createTranscendRestClient(auth, graphql, { sombraUrl, sombraCustomerKey }),
      graphql,
      dashboardUrl,
    };
  },
});
