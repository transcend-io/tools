#!/usr/bin/env node
import { createMCPServer } from '@transcend-io/mcp-server-base';

import { DOCS_OAUTH_SCOPES } from './scopes.js';
import { getDocsTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-docs',
  version: '1.0.0',
  oauthScopes: DOCS_OAUTH_SCOPES,
  getTools: getDocsTools,
});
