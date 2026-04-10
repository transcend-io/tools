#!/usr/bin/env node
import { createMCPServer } from '@transcend-io/mcp-server-core';

import { getConsentPrompts } from './prompts/index.js';
import { getConsentResources } from './resources/index.js';
import { getConsentTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-consent',
  version: '1.0.0',
  getTools: getConsentTools,
  getPrompts: getConsentPrompts,
  getResources: getConsentResources,
});
