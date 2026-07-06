#!/usr/bin/env node
import { createMCPServer, TranscendRestClient } from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { AssessmentsMixin } from './graphql.js';
import { ASSESSMENT_OAUTH_SCOPES } from './scopes.js';
import { getAssessmentTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-assessment',
  version: packageJson.version,
  oauthScopes: ASSESSMENT_OAUTH_SCOPES,
  getTools: getAssessmentTools,
  createClients: ({ auth, sombraUrl, graphqlUrl, dashboardUrl }) => ({
    rest: new TranscendRestClient(auth, sombraUrl),
    graphql: new AssessmentsMixin(auth, graphqlUrl),
    dashboardUrl,
  }),
});
