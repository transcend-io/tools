#!/usr/bin/env node
import { createMCPServer } from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { DOCS_OAUTH_SCOPES } from './scopes.js';
import { getDocsTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-docs',
  version: packageJson.version,
  oauthScopes: DOCS_OAUTH_SCOPES,
  getTools: getDocsTools,
});
