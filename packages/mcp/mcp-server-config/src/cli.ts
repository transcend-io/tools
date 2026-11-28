#!/usr/bin/env node
import {
  createMCPServer,
  createTranscendRestClient,
  TranscendGraphQLBase,
} from '@transcend-io/mcp-server-base';
import { TranscendMcpServer, getMcpServerOAuthScopes } from '@transcend-io/sdk';

import packageJson from '../package.json' with { type: 'json' };
import {
  oauthScopesForConfigAllowlist,
  parseConfigResourceAllowlistFromEnv,
} from './helpers/configResourceAllowlist.js';
import { getConfigTools } from './index.js';
import { CONFIG_SERVER_INSTRUCTIONS } from './server-instructions.js';

function resolveConfigOauthScopes(): readonly string[] {
  try {
    const allowlist = parseConfigResourceAllowlistFromEnv();
    if (!allowlist) {
      return getMcpServerOAuthScopes(TranscendMcpServer.Config);
    }
    return oauthScopesForConfigAllowlist(allowlist);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

createMCPServer({
  name: 'transcend-mcp-config',
  version: packageJson.version,
  oauthScopes: resolveConfigOauthScopes(),
  instructions: CONFIG_SERVER_INSTRUCTIONS,
  getTools: getConfigTools,
  createClients: ({
    auth,
    sombraUrl,
    sombraCustomerKey,
    requireMultiTenantSombra,
    graphqlUrl,
    dashboardUrl,
  }) => {
    const graphql = new TranscendGraphQLBase(auth, graphqlUrl);
    return {
      rest: createTranscendRestClient(auth, graphql, {
        sombraUrl,
        sombraCustomerKey,
        requireMultiTenantSombra,
      }),
      graphql,
      dashboardUrl,
    };
  },
});
