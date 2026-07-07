#!/usr/bin/env node
import {
  createMCPServer,
  TranscendGraphQLBase,
  TranscendRestClient,
} from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { PREFERENCE_OAUTH_SCOPES } from './scopes.js';
import { getPreferenceTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-preferences',
  version: packageJson.version,
  oauthScopes: PREFERENCE_OAUTH_SCOPES,
  getTools: getPreferenceTools,
  createClients: ({ auth, sombraUrl, graphqlUrl, dashboardUrl }) => ({
    rest: new TranscendRestClient(auth, sombraUrl),
    graphql: new TranscendGraphQLBase(auth, graphqlUrl),
    dashboardUrl,
  }),
});
