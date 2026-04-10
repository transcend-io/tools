#!/usr/bin/env node
import { createMCPServer } from '@transcend-io/mcp-server-core';

import { AssessmentsMixin } from './graphql.js';
import { getAssessmentTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-assessments',
  version: '1.0.0',
  getTools: getAssessmentTools,
  createClients: (apiKey, graphqlUrl) => ({
    graphql: new AssessmentsMixin(apiKey, graphqlUrl),
  }),
});
