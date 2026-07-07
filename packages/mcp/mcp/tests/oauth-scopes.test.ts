import { ADMIN_OAUTH_SCOPES } from '@transcend-io/mcp-server-admin';
import { ASSESSMENT_OAUTH_SCOPES } from '@transcend-io/mcp-server-assessment';
import { OFFLINE_ACCESS_SCOPE } from '@transcend-io/mcp-server-base';
import { CONSENT_OAUTH_SCOPES } from '@transcend-io/mcp-server-consent';
import { DISCOVERY_OAUTH_SCOPES } from '@transcend-io/mcp-server-discovery';
import { DSR_OAUTH_SCOPES } from '@transcend-io/mcp-server-dsr';
import { INVENTORY_OAUTH_SCOPES } from '@transcend-io/mcp-server-inventory';
import { PREFERENCE_OAUTH_SCOPES } from '@transcend-io/mcp-server-preferences';
import { WORKFLOW_OAUTH_SCOPES } from '@transcend-io/mcp-server-workflows';
import { ScopeName } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import { UMBRELLA_OAUTH_SCOPES } from '../src/oauth-scopes.js';

describe('UMBRELLA_OAUTH_SCOPES', () => {
  it('includes offline_access and scopes from every domain package', () => {
    expect(UMBRELLA_OAUTH_SCOPES).toContain(OFFLINE_ACCESS_SCOPE);

    for (const scopeList of [
      ADMIN_OAUTH_SCOPES,
      ASSESSMENT_OAUTH_SCOPES,
      CONSENT_OAUTH_SCOPES,
      DISCOVERY_OAUTH_SCOPES,
      DSR_OAUTH_SCOPES,
      INVENTORY_OAUTH_SCOPES,
      PREFERENCE_OAUTH_SCOPES,
      WORKFLOW_OAUTH_SCOPES,
    ]) {
      for (const scope of scopeList) {
        expect(UMBRELLA_OAUTH_SCOPES).toContain(scope);
      }
    }
  });

  it('includes anchor scopes from each domain', () => {
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ViewEmployees);
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ViewAssessments);
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ViewConsentManager);
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ViewCodeScanning);
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ViewRequests);
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ViewDataMap);
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ViewPrivacyCenter);
    expect(UMBRELLA_OAUTH_SCOPES).toContain(ScopeName.ViewAllActionItems);
  });
});
