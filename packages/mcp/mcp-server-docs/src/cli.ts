#!/usr/bin/env node
import { createMCPServer } from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { getDocsTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-docs',
  version: packageJson.version,
  requireStartupAuth: false,
  oauthScopes: [],
  getTools: getDocsTools,
});
