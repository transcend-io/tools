#!/usr/bin/env node
import { createMCPServer } from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { CONSENT_OAUTH_SCOPES } from './scopes.js';
import { getConsentTools } from './tools/index.js';

createMCPServer({
  name: 'transcend-mcp-consent',
  version: packageJson.version,
  oauthScopes: CONSENT_OAUTH_SCOPES,
  getTools: getConsentTools,
});
