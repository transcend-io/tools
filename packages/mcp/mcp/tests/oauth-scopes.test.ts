import { OFFLINE_ACCESS_SCOPE } from '@transcend-io/mcp-server-base';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  MCP_SERVER_OAUTH_SCOPES,
  TranscendMcpServer,
  TranscendPullResource,
  getMcpServerOAuthScopes,
} from '@transcend-io/sdk';
import { describe, expect, it } from 'vitest';

import type { McpServerAllowlist } from '../src/mcp-server-allowlist.js';
import { resolveUmbrellaOAuthScopes, UMBRELLA_OAUTH_SCOPES } from '../src/oauth-scopes.js';

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

describe('resolveUmbrellaOAuthScopes', () => {
  it('requests only consent scopes when the allowlist is consent-only', () => {
    const allowlist: McpServerAllowlist = new Set([TranscendMcpServer.Consent]);
    const scopes = resolveUmbrellaOAuthScopes(allowlist, undefined);
    expect(scopes).toContain(OFFLINE_ACCESS_SCOPE);
    expect(scopes).toContain(ScopeName.ViewConsentManager);
    expect(scopes).not.toContain(ScopeName.ViewRequests);
  });

  it('caps config scopes to the listed resources', () => {
    const allowlist: McpServerAllowlist = new Set([TranscendMcpServer.Config]);
    const capped = resolveUmbrellaOAuthScopes(allowlist, [TranscendPullResource.ConsentManager]);
    const full = resolveUmbrellaOAuthScopes(allowlist, undefined);
    expect(capped).toContain(ScopeName.ViewConsentManager);
    expect(capped.length).toBeLessThan(full.length);
    expect(capped).not.toContain(ScopeName.ViewRequests);
  });
});
