#!/usr/bin/env node
import { createMCPServer } from '@transcend-io/mcp-server-base';

import { CONSENT_OAUTH_SCOPES } from './scopes.js';
import { getConsentTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-consent',
  version: '1.0.0',
  oauthScopes: CONSENT_OAUTH_SCOPES,
  getTools: getConsentTools,
});
