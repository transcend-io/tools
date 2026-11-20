#!/usr/bin/env node
import {
  createMCPServer,
  createTranscendRestClient,
  TranscendGraphQLBase,
} from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { getConfigTools } from './index.js';
import { CONFIG_OAUTH_SCOPES } from './scopes.js';
import { CONFIG_SERVER_INSTRUCTIONS } from './server-instructions.js';

createMCPServer({
  name: 'transcend-mcp-config',
  version: packageJson.version,
  oauthScopes: CONFIG_OAUTH_SCOPES,
  instructions: CONFIG_SERVER_INSTRUCTIONS,
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
