import { OFFLINE_ACCESS_SCOPE } from '@transcend-io/mcp-server-base';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  MCP_SERVER_OAUTH_SCOPES,
  TranscendMcpServer,
  getMcpServerOAuthScopes,
} from '@transcend-io/sdk';
import { describe, expect, it } from 'vitest';

import { UMBRELLA_OAUTH_SCOPES } from '../src/oauth-scopes.js';

describe('UMBRELLA_OAUTH_SCOPES', () => {
  it('includes offline_access and every domain scope', () => {
    expect(UMBRELLA_OAUTH_SCOPES).toContain(OFFLINE_ACCESS_SCOPE);
    for (const server of Object.values(TranscendMcpServer)) {
      for (const scope of MCP_SERVER_OAUTH_SCOPES[server]) {
        expect(UMBRELLA_OAUTH_SCOPES).toContain(scope);
      }
    }
  });

  it('includes representative scopes from each domain', () => {
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ViewEmployees);
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ViewAssessments);
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ViewConsentManager);
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ViewCustomFunction);
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ViewCodeScanning);
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ViewRequests);
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ViewDataMap);
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ViewPrivacyCenter);
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ViewAllActionItems);
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ActivatePolicyEngineBundles);
  });
});

describe('MCP_SERVER_OAUTH_SCOPES', () => {
  it('returns non-empty scopes for every server', () => {
    for (const server of Object.values(TranscendMcpServer)) {
      expect(getMcpServerOAuthScopes(server).length).toBeGreaterThan(0);
    }
  });
});
