#!/usr/bin/env node
import {
  createMCPServer,
  createTranscendRestClient,
  TranscendGraphQLBase,
} from '@transcend-io/mcp-server-base';
import { TranscendMcpServer, getMcpServerOAuthScopes } from '@transcend-io/sdk';

import packageJson from '../package.json' with { type: 'json' };
import { getPreferenceTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-preferences',
  version: packageJson.version,
  oauthScopes: getMcpServerOAuthScopes(TranscendMcpServer.Preferences),
  getTools: getPreferenceTools,
  createClients: ({ auth, sombraUrl, sombraCustomerKey, graphqlUrl, dashboardUrl }) => {
    const graphql = new TranscendGraphQLBase(auth, graphqlUrl);
    return {
      rest: createTranscendRestClient(auth, graphql, { sombraUrl, sombraCustomerKey }),
      graphql,
      dashboardUrl,
    };
  },
});
