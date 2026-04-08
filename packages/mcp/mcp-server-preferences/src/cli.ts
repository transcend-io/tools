#!/usr/bin/env node
import {
  createMCPServer,
  TranscendGraphQLBase,
  TranscendRestClient,
} from '@transcend-io/mcp-server-core';

import { getPreferenceTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-preferences',
  version: '1.0.0',
  getTools: getPreferenceTools,
  createClients: (apiKey, sombraUrl, graphqlUrl) => ({
    rest: new TranscendRestClient(apiKey, sombraUrl),
    graphql: new TranscendGraphQLBase(apiKey, graphqlUrl),
  }),
});
