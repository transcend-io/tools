import { afterEach, describe, expect, it } from 'vitest';

import {
  OFFLINE_ACCESS_SCOPE,
  configureOAuthScopes,
  getOAuthScopes,
  mergeOAuthScopes,
  resetConfiguredOAuthScopes,
} from '../src/oauth/scopes.js';

describe('mergeOAuthScopes', () => {
  it('dedupes scopes and always adds offline_access', () => {
    expect(mergeOAuthScopes(['viewRequests'], ['viewRequests', 'viewDataMap'])).toEqual([
      'viewRequests',
      'viewDataMap',
      OFFLINE_ACCESS_SCOPE,
    ]);
  });

  it('strips duplicate offline_access from inputs and adds it once', () => {
    expect(mergeOAuthScopes([OFFLINE_ACCESS_SCOPE, 'viewAssessments'])).toEqual([
      'viewAssessments',
      OFFLINE_ACCESS_SCOPE,
    ]);
  });

  it('returns only offline_access when given empty input lists', () => {
    expect(mergeOAuthScopes([], [])).toEqual([OFFLINE_ACCESS_SCOPE]);
  });
});

describe('configureOAuthScopes and getOAuthScopes', () => {
  afterEach(() => {
    resetConfiguredOAuthScopes();
  });

  it('throws when scopes were never configured', () => {
    expect(() => getOAuthScopes()).toThrow(/OAuth scopes are not configured/);
  });

  it('returns merged scopes after configureOAuthScopes', () => {
    configureOAuthScopes(['viewRequests', 'manageDataMap']);
    expect(getOAuthScopes()).toEqual(['viewRequests', 'manageDataMap', OFFLINE_ACCESS_SCOPE]);
  });
});
