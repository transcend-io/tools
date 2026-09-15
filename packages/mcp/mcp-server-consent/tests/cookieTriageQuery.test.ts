import {
  ConsentTrackerStatus,
  CookieOrderField,
  OrderDirection,
} from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import {
  COOKIE_TRIAGE_UI_PAGE_SIZE,
  CookieTriagePurposeCategory,
} from '../src/lib/cookieTriageConfig.js';
import {
  buildTriageBulkUpdateArgs,
  buildTriageDormantCountArgs,
  buildTriageListArgs,
  buildTriageNotesUpdateArgs,
  buildTriagePendingCountArgs,
  buildTriagePurposeCountArgs,
  buildTriagePurposesUpdateArgs,
  buildTriageUpdateArgs,
  dormantCutoffIso,
} from '../src/lib/cookieTriageQuery.js';
import { ConsentTriageType, CookieTriageDecision } from '../src/lib/cookieTriageTypes.js';

describe('buildTriageListArgs', () => {
  it('filters cookies by trackingPurposes, including Unknown and custom slugs', () => {
    expect(
      buildTriageListArgs(ConsentTriageType.Cookies, CookieTriagePurposeCategory.Advertising, 20),
    ).toEqual({
      status: ConsentTrackerStatus.NeedsReview,
      limit: COOKIE_TRIAGE_UI_PAGE_SIZE,
      offset: 20,
      orderField: CookieOrderField.Occurrences,
      orderDirection: OrderDirection.Desc,
      trackingPurposes: [CookieTriagePurposeCategory.Advertising],
    });

    expect(
      buildTriageListArgs(ConsentTriageType.Cookies, CookieTriagePurposeCategory.Custom, 0, [
        'Loyalty',
        'Support',
      ]),
    ).toEqual({
      status: ConsentTrackerStatus.NeedsReview,
      limit: COOKIE_TRIAGE_UI_PAGE_SIZE,
      offset: 0,
      orderField: CookieOrderField.Occurrences,
      orderDirection: OrderDirection.Desc,
      trackingPurposes: ['Loyalty', 'Support'],
    });
    expect(
      buildTriageListArgs(ConsentTriageType.Cookies, CookieTriagePurposeCategory.Unknown, 0),
    ).toEqual({
      status: ConsentTrackerStatus.NeedsReview,
      limit: COOKIE_TRIAGE_UI_PAGE_SIZE,
      offset: 0,
      orderField: CookieOrderField.Occurrences,
      orderDirection: OrderDirection.Desc,
      trackingPurposes: [CookieTriagePurposeCategory.Unknown],
    });
  });

  it('filters data flows by trackingTypes, including Unknown and custom slugs', () => {
    expect(
      buildTriageListArgs(ConsentTriageType.DataFlows, CookieTriagePurposeCategory.Analytics, 0),
    ).toEqual({
      status: ConsentTrackerStatus.NeedsReview,
      limit: COOKIE_TRIAGE_UI_PAGE_SIZE,
      offset: 0,
      orderField: CookieOrderField.Occurrences,
      orderDirection: OrderDirection.Desc,
      showZeroActivity: true,
      trackingTypes: [CookieTriagePurposeCategory.Analytics],
    });
    expect(
      buildTriageListArgs(ConsentTriageType.DataFlows, CookieTriagePurposeCategory.Custom, 0, [
        'Loyalty',
      ]),
    ).toEqual({
      status: ConsentTrackerStatus.NeedsReview,
      limit: COOKIE_TRIAGE_UI_PAGE_SIZE,
      offset: 0,
      orderField: CookieOrderField.Occurrences,
      orderDirection: OrderDirection.Desc,
      showZeroActivity: true,
      trackingTypes: ['Loyalty'],
    });
    expect(
      buildTriageListArgs(ConsentTriageType.DataFlows, CookieTriagePurposeCategory.Unknown, 0),
    ).toEqual({
      status: ConsentTrackerStatus.NeedsReview,
      limit: COOKIE_TRIAGE_UI_PAGE_SIZE,
      offset: 0,
      orderField: CookieOrderField.Occurrences,
      orderDirection: OrderDirection.Desc,
      showZeroActivity: true,
      trackingTypes: [CookieTriagePurposeCategory.Unknown],
    });
  });

  it('omits showZeroActivity for cookie triage list args', () => {
    expect(
      buildTriageListArgs(ConsentTriageType.Cookies, CookieTriagePurposeCategory.Advertising, 0),
    ).not.toHaveProperty('showZeroActivity');
  });

  it('returns null when Custom is requested with no purpose slugs', () => {
    expect(
      buildTriageListArgs(ConsentTriageType.Cookies, CookieTriagePurposeCategory.Custom, 0, []),
    ).toBeNull();
    expect(
      buildTriagePurposeCountArgs(ConsentTriageType.DataFlows, CookieTriagePurposeCategory.Custom),
    ).toBeNull();
  });
});

describe('purpose count args', () => {
  it('reuses purpose filters with limit: 1 for tab badges', () => {
    expect(
      buildTriagePurposeCountArgs(
        ConsentTriageType.Cookies,
        CookieTriagePurposeCategory.Advertising,
      ),
    ).toEqual({
      status: ConsentTrackerStatus.NeedsReview,
      limit: 1,
      offset: 0,
      orderField: CookieOrderField.Occurrences,
      orderDirection: OrderDirection.Desc,
      trackingPurposes: [CookieTriagePurposeCategory.Advertising],
    });
    expect(
      buildTriagePurposeCountArgs(ConsentTriageType.Cookies, CookieTriagePurposeCategory.Custom, [
        'Loyalty',
      ]),
    ).toEqual({
      status: ConsentTrackerStatus.NeedsReview,
      limit: 1,
      offset: 0,
      orderField: CookieOrderField.Occurrences,
      orderDirection: OrderDirection.Desc,
      trackingPurposes: ['Loyalty'],
    });
    expect(
      buildTriagePurposeCountArgs(
        ConsentTriageType.DataFlows,
        CookieTriagePurposeCategory.Analytics,
      ),
    ).toEqual({
      status: ConsentTrackerStatus.NeedsReview,
      limit: 1,
      offset: 0,
      orderField: CookieOrderField.Occurrences,
      orderDirection: OrderDirection.Desc,
      showZeroActivity: true,
      trackingTypes: [CookieTriagePurposeCategory.Analytics],
    });
  });
});

describe('summary count args', () => {
  it('requests a single-row NEEDS_REVIEW page for the pending total', () => {
    expect(buildTriagePendingCountArgs()).toEqual({
      status: ConsentTrackerStatus.NeedsReview,
      limit: 1,
      offset: 0,
    });
  });

  it('filters dormant counts to lastDiscoveredAt before the 30-day cutoff', () => {
    const now = Date.parse('2026-09-03T12:00:00.000Z');
    expect(buildTriageDormantCountArgs(now)).toEqual({
      status: ConsentTrackerStatus.NeedsReview,
      limit: 1,
      offset: 0,
      lastDiscoveredAtBefore: dormantCutoffIso(now),
    });
    expect(dormantCutoffIso(now)).toBe('2026-08-04T12:00:00.000Z');
  });
});

describe('buildTriageUpdateArgs', () => {
  const cookie = {
    name: '_ga',
    id: 'cookie-1',
    trackingPurposes: [CookieTriagePurposeCategory.Analytics],
  };
  const dataFlow = {
    name: 'example.com',
    id: 'df-1',
    trackingPurposes: [CookieTriagePurposeCategory.Advertising],
  };

  it('approves cookies as LIVE with existing purposes', () => {
    expect(
      buildTriageUpdateArgs(ConsentTriageType.Cookies, cookie, CookieTriageDecision.Approve),
    ).toEqual({
      cookies: [
        {
          name: '_ga',
          status: ConsentTrackerStatus.Live,
          isJunk: false,
          trackingPurposes: [CookieTriagePurposeCategory.Analytics],
        },
      ],
    });
  });

  it('junks cookies as LIVE + isJunk', () => {
    expect(
      buildTriageUpdateArgs(ConsentTriageType.Cookies, cookie, CookieTriageDecision.Junk),
    ).toEqual({
      cookies: [{ name: '_ga', status: ConsentTrackerStatus.Live, isJunk: true }],
    });
  });

  it('undoes cookies back to NEEDS_REVIEW', () => {
    expect(buildTriageUpdateArgs(ConsentTriageType.Cookies, cookie, undefined)).toEqual({
      cookies: [{ name: '_ga', status: ConsentTrackerStatus.NeedsReview, isJunk: false }],
    });
  });

  it('updates data flows by id', () => {
    expect(
      buildTriageUpdateArgs(ConsentTriageType.DataFlows, dataFlow, CookieTriageDecision.Approve),
    ).toEqual({
      dataFlows: [
        {
          id: 'df-1',
          status: ConsentTrackerStatus.Live,
          isJunk: false,
          trackingPurposes: [CookieTriagePurposeCategory.Advertising],
        },
      ],
    });
    expect(
      buildTriageUpdateArgs(ConsentTriageType.DataFlows, dataFlow, CookieTriageDecision.Junk),
    ).toEqual({
      dataFlows: [{ id: 'df-1', status: ConsentTrackerStatus.Live, isJunk: true }],
    });
    expect(buildTriageUpdateArgs(ConsentTriageType.DataFlows, dataFlow, undefined)).toEqual({
      dataFlows: [{ id: 'df-1', status: ConsentTrackerStatus.NeedsReview, isJunk: false }],
    });
  });

  it('batches mixed approve and junk targets into one payload', () => {
    expect(
      buildTriageBulkUpdateArgs(ConsentTriageType.Cookies, [
        { item: cookie, decision: CookieTriageDecision.Approve },
        { item: { name: '_stale', id: 'cookie-2' }, decision: CookieTriageDecision.Junk },
      ]),
    ).toEqual({
      cookies: [
        {
          name: '_ga',
          status: ConsentTrackerStatus.Live,
          isJunk: false,
          trackingPurposes: [CookieTriagePurposeCategory.Analytics],
        },
        { name: '_stale', status: ConsentTrackerStatus.Live, isJunk: true },
      ],
    });
  });
});

describe('buildTriageNotesUpdateArgs', () => {
  const cookie = {
    name: '_ga',
    id: 'cookie-1',
    trackingPurposes: [CookieTriagePurposeCategory.Analytics],
  };
  const dataFlow = {
    name: 'example.com',
    id: 'df-1',
    trackingPurposes: [CookieTriagePurposeCategory.Advertising],
  };

  it('writes description for cookies and data flows', () => {
    expect(buildTriageNotesUpdateArgs(ConsentTriageType.Cookies, cookie, 'team note')).toEqual({
      cookies: [{ name: '_ga', description: 'team note' }],
    });
    expect(buildTriageNotesUpdateArgs(ConsentTriageType.DataFlows, dataFlow, '')).toEqual({
      dataFlows: [{ id: 'df-1', description: '' }],
    });
  });
});

describe('buildTriagePurposesUpdateArgs', () => {
  const cookie = {
    name: '_ga',
    id: 'cookie-1',
    trackingPurposes: [CookieTriagePurposeCategory.Analytics],
  };
  const dataFlow = {
    name: 'example.com',
    id: 'df-1',
    trackingPurposes: [CookieTriagePurposeCategory.Advertising],
  };

  it('writes trackingPurposes for cookies and data flows', () => {
    expect(
      buildTriagePurposesUpdateArgs(ConsentTriageType.Cookies, cookie, [
        CookieTriagePurposeCategory.Essential,
      ]),
    ).toEqual({
      cookies: [{ name: '_ga', trackingPurposes: [CookieTriagePurposeCategory.Essential] }],
    });
    expect(
      buildTriagePurposesUpdateArgs(ConsentTriageType.DataFlows, dataFlow, [
        CookieTriagePurposeCategory.Functional,
      ]),
    ).toEqual({
      dataFlows: [{ id: 'df-1', trackingPurposes: [CookieTriagePurposeCategory.Functional] }],
    });
  });
});
