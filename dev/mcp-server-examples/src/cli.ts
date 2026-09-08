#!/usr/bin/env node
import { createMCPServer } from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { getExampleTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-examples',
  version: packageJson.version,
  requireStartupAuth: false,
  oauthScopes: [],
  getTools: getExampleTools,
});
