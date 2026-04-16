#!/usr/bin/env node
import { createMCPServer, TranscendGraphQLBase } from '@transcend-io/mcp-server-core';

import { getPreferenceTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-preferences',
  version: '1.0.0',
  getTools: getPreferenceTools,
  createClients: (apiKey, graphqlUrl) => ({
    graphql: new TranscendGraphQLBase(apiKey, graphqlUrl),
  }),
});
