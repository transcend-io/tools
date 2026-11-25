import { TranscendPullResource } from '@transcend-io/sdk';
import { describe, expect, it } from 'vitest';

import {
  oauthScopesForConfigAllowlist,
  resolvePullResourcesFromInput,
} from '../src/helpers/configResourceAllowlist.js';

describe('resolvePullResourcesFromInput', () => {
  const allowlist = [TranscendPullResource.DataSilos, TranscendPullResource.Purposes];

  it('uses the allowlist for default and all when set', () => {
    expect(resolvePullResourcesFromInput(undefined, allowlist)).toEqual(allowlist);
    expect(resolvePullResourcesFromInput(['all'], allowlist)).toEqual(allowlist);
  });

  it('rejects sections outside the allowlist', () => {
    expect(() => resolvePullResourcesFromInput(['dataSilos', 'enrichers'], allowlist)).toThrow(
      /TRANSCEND_CONFIG_RESOURCES allowlist/,
    );
  });

  it('derives oauth scopes only for allowlisted sections', () => {
    const scopes = oauthScopesForConfigAllowlist([TranscendPullResource.DataSilos]);
    expect(scopes).toContain('viewDataMap');
    expect(scopes).not.toContain('manageAssessments');
  });
});
