#!/usr/bin/env node
import { createMCPServer, TranscendRestClient } from '@transcend-io/mcp-server-base';

import { AssessmentsMixin } from './graphql.js';
import { getAssessmentTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-assessment',
  version: '1.0.0',
  getTools: getAssessmentTools,
  createClients: (auth, sombraUrl, graphqlUrl) => ({
    rest: new TranscendRestClient(auth, sombraUrl),
    graphql: new AssessmentsMixin(auth, graphqlUrl),
  }),
});
