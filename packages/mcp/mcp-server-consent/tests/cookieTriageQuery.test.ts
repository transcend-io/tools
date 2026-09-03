import { describe, expect, it } from 'vitest';

import { buildTriageListArgs, COOKIE_TRIAGE_UI_PAGE_SIZE } from '../src/lib/cookieTriageQuery.js';

describe('buildTriageListArgs', () => {
  it('filters cookies by trackingPurposes except Other', () => {
    expect(buildTriageListArgs('cookies', 'Advertising', 20)).toEqual({
      status: 'NEEDS_REVIEW',
      first: COOKIE_TRIAGE_UI_PAGE_SIZE,
      offset: 20,
      orderField: 'occurrences',
      orderDirection: 'DESC',
      trackingPurposes: ['Advertising'],
    });

    expect(buildTriageListArgs('cookies', 'NoPurpose', 0)).toEqual({
      status: 'NEEDS_REVIEW',
      first: COOKIE_TRIAGE_UI_PAGE_SIZE,
      offset: 0,
      orderField: 'occurrences',
      orderDirection: 'DESC',
    });
  });

  it('filters data flows by trackingTypes except Other', () => {
    expect(buildTriageListArgs('data_flows', 'Analytics', 0)).toMatchObject({
      trackingTypes: ['Analytics'],
    });
    expect(buildTriageListArgs('data_flows', 'NoPurpose', 0)).not.toHaveProperty('trackingTypes');
  });
});
