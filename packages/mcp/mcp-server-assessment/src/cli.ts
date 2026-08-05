#!/usr/bin/env node
import { createMCPServer, createTranscendRestClient } from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { AssessmentsMixin } from './graphql.js';
import { ASSESSMENT_OAUTH_SCOPES } from './scopes.js';
import { getAssessmentTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-assessment',
  version: packageJson.version,
  oauthScopes: ASSESSMENT_OAUTH_SCOPES,
  getTools: getAssessmentTools,
  createClients: ({ auth, sombraUrl, sombraCustomerKey, graphqlUrl, dashboardUrl }) => {
    const graphql = new AssessmentsMixin(auth, graphqlUrl);
    return {
      rest: createTranscendRestClient(auth, graphql, { sombraUrl, sombraCustomerKey }),
      graphql,
      dashboardUrl,
    };
  },
});
