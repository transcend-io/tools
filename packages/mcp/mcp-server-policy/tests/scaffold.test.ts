import { describe, it, expect } from 'vitest';

import { POLICY_OAUTH_SCOPES } from '../src/scopes.js';
import { getPolicyTools } from '../src/tools/index.js';

describe('mcp-server-policy scaffold', () => {
  it('exports Activate Policy OAuth scope', () => {
    expect(POLICY_OAUTH_SCOPES).toEqual(['activatePolicyEngineBundles']);
  });

  it('registers no tools until follow-up PRs land', () => {
    const tools = getPolicyTools({
      rest: {} as never,
      graphql: {} as never,
      dashboardUrl: 'https://app.transcend.io',
      transcendApiUrl: 'https://api.transcend.io',
      auth: { type: 'apiKey' as const, apiKey: 'test-key' },
    });
    expect(tools).toEqual([]);
  });
});
