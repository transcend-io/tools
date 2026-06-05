#!/usr/bin/env node
import { createMCPServer, TranscendRestClient } from '@transcend-io/mcp-server-base';

import { AssessmentsMixin } from './graphql.js';
import { getAssessmentMcpResources } from './mcp-resources.js';
import { createAssessmentsListOrgUsersTool } from './tools/assessments_list_org_users.js';
import { getAssessmentTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-assessment',
  version: '1.0.0',
  getTools: (clients) => [
    ...getAssessmentTools(clients),
    createAssessmentsListOrgUsersTool(clients),
  ],
  getResources: getAssessmentMcpResources,
  createClients: ({ auth, sombraUrl, graphqlUrl, dashboardUrl }) => ({
    rest: new TranscendRestClient(auth, sombraUrl),
    graphql: new AssessmentsMixin(auth, graphqlUrl),
    dashboardUrl,
  }),
});
