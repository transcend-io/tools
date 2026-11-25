#!/usr/bin/env node
import { createMCPServer } from '@transcend-io/mcp-server-base';
import { TranscendMcpServer, getMcpServerOAuthScopes } from '@transcend-io/sdk';

import packageJson from '../package.json' with { type: 'json' };
import { getConsentPrompts } from './prompts/index.js';
import { getConsentTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-consent',
  version: packageJson.version,
  oauthScopes: getMcpServerOAuthScopes(TranscendMcpServer.Consent),
  getTools: getConsentTools,
  getPrompts: getConsentPrompts,
});
