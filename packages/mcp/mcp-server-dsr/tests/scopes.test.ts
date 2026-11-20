import { ScopeName } from '@transcend-io/privacy-types';
import { getMcpServerOAuthScopes, TranscendMcpServer } from '@transcend-io/sdk';
import { describe, expect, it } from 'vitest';

const DSR_OAUTH_SCOPES = getMcpServerOAuthScopes(TranscendMcpServer.Dsr);

describe('DSR_OAUTH_SCOPES', () => {
  it('is non-empty and includes viewRequests and viewWorkflows', () => {
    expect(DSR_OAUTH_SCOPES.length).toBeGreaterThan(0);
    expect(DSR_OAUTH_SCOPES).toContain(ScopeName.ViewRequests);
    expect(DSR_OAUTH_SCOPES).toContain(ScopeName.ViewWorkflows);
  });
});
