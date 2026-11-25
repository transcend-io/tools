import { describe, expect, it } from 'vitest';

import {
  MCP_SERVER_OAUTH_SCOPES,
  TranscendMcpServer,
  getMcpServerOAuthScopes,
} from './oauthScopes.js';

describe('MCP server OAuth scopes', () => {
  it('defines non-empty scopes for every server', () => {
    for (const server of Object.values(TranscendMcpServer)) {
      expect(MCP_SERVER_OAUTH_SCOPES[server].length).toBeGreaterThan(0);
      expect(getMcpServerOAuthScopes(server)).toEqual(MCP_SERVER_OAUTH_SCOPES[server]);
    }
  });
});
