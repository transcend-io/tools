#!/usr/bin/env node
import { createMCPServer, TranscendRestClient } from '@transcend-io/mcp-server-core';

import { ConsentMixin } from './graphql.js';
import { getConsentTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-consent',
  version: '1.0.0',
  getTools: getConsentTools,
  createClients: (apiKey, sombraUrl, graphqlUrl) => ({
    rest: new TranscendRestClient(apiKey, sombraUrl),
    graphql: new ConsentMixin(apiKey, graphqlUrl),
  }),
});
