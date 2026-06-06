#!/usr/bin/env node
import {
  createMCPServer,
  TranscendGraphQLBase,
  TranscendRestClient,
} from '@transcend-io/mcp-server-base';

import { getPreferenceTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-preferences',
  version: '1.0.0',
  getTools: getPreferenceTools,
  createClients: ({ auth, sombraUrl, graphqlUrl, dashboardUrl }) => ({
    rest: new TranscendRestClient(auth, sombraUrl),
    graphql: new TranscendGraphQLBase(auth, graphqlUrl),
    dashboardUrl,
  }),
});
