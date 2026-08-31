#!/usr/bin/env node
import {
  createMCPServer,
  createTranscendRestClient,
  TranscendGraphQLBase,
} from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { POLICY_OAUTH_SCOPES } from './scopes.js';
import { POLICY_SERVER_INSTRUCTIONS } from './server-instructions.js';
import { getPolicyTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-policy',
  version: packageJson.version,
  oauthScopes: POLICY_OAUTH_SCOPES,
  instructions: POLICY_SERVER_INSTRUCTIONS,
  getTools: getPolicyTools,
  createClients: ({ auth, sombraUrl, sombraCustomerKey, graphqlUrl, dashboardUrl }) => {
    const graphql = new TranscendGraphQLBase(auth, graphqlUrl);
    return {
      rest: createTranscendRestClient(auth, graphql, { sombraUrl, sombraCustomerKey }),
      graphql,
      dashboardUrl,
      transcendApiUrl: graphqlUrl,
      auth,
    };
  },
});
