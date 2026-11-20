#!/usr/bin/env node
import {
  createMCPServer,
  createTranscendRestClient,
  TranscendGraphQLBase,
} from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { PRIVACY_CENTER_OAUTH_SCOPES } from './scopes.js';
import { getPrivacyCenterTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-privacy-center',
  version: packageJson.version,
  oauthScopes: PRIVACY_CENTER_OAUTH_SCOPES,
  getTools: getPrivacyCenterTools,
  createClients: ({ auth, sombraUrl, sombraCustomerKey, graphqlUrl, dashboardUrl }) => {
    const graphql = new TranscendGraphQLBase(auth, graphqlUrl);
    return {
      rest: createTranscendRestClient(auth, graphql, { sombraUrl, sombraCustomerKey }),
      graphql,
      dashboardUrl,
    };
  },
});
