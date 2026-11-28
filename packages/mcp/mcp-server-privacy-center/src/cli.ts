#!/usr/bin/env node
import {
  createMCPServer,
  createTranscendRestClient,
  TranscendGraphQLBase,
} from '@transcend-io/mcp-server-base';
import { TranscendMcpServer, getMcpServerOAuthScopes } from '@transcend-io/sdk';

import packageJson from '../package.json' with { type: 'json' };
import { getPrivacyCenterTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-privacy-center',
  version: packageJson.version,
  oauthScopes: getMcpServerOAuthScopes(TranscendMcpServer.PrivacyCenter),
  getTools: getPrivacyCenterTools,
  createClients: ({
    auth,
    sombraUrl,
    sombraCustomerKey,
    requireMultiTenantSombra,
    graphqlUrl,
    dashboardUrl,
  }) => {
    const graphql = new TranscendGraphQLBase(auth, graphqlUrl);
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
