import { ScopeName } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import { DSR_OAUTH_SCOPES } from '../src/scopes.js';

describe('DSR_OAUTH_SCOPES', () => {
  it('is non-empty and includes viewRequests', () => {
    expect(DSR_OAUTH_SCOPES.length).toBeGreaterThan(0);
    expect(DSR_OAUTH_SCOPES).toContain(ScopeName.ViewRequests);
  });
});
