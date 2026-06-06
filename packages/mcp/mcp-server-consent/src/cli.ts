#!/usr/bin/env node
import { createMCPServer } from '@transcend-io/mcp-server-base';

import { getConsentTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-consent',
  version: '1.0.0',
  getTools: getConsentTools,
});
