import { describe, expect, it } from 'vitest';

import {
  buildTriageDormantCountArgs,
  buildTriageListArgs,
  buildTriageNotesUpdateArgs,
  buildTriagePendingCountArgs,
  buildTriagePurposeCountArgs,
  buildTriagePurposesUpdateArgs,
  buildTriageUpdateArgs,
  COOKIE_TRIAGE_UI_PAGE_SIZE,
  dormantCutoffIso,
} from '../src/lib/cookieTriageQuery.js';

describe('buildTriageListArgs', () => {
  it('filters cookies by trackingPurposes, including Unknown and custom slugs', () => {
    expect(buildTriageListArgs('cookies', 'Advertising', 20)).toEqual({
      status: 'NEEDS_REVIEW',
      first: COOKIE_TRIAGE_UI_PAGE_SIZE,
      offset: 20,
      orderField: 'occurrences',
      orderDirection: 'DESC',
      trackingPurposes: ['Advertising'],
    });

    expect(buildTriageListArgs('cookies', 'Custom', 0, ['Loyalty', 'Support'])).toEqual({
      status: 'NEEDS_REVIEW',
      first: COOKIE_TRIAGE_UI_PAGE_SIZE,
      offset: 0,
      orderField: 'occurrences',
      orderDirection: 'DESC',
      trackingPurposes: ['Loyalty', 'Support'],
    });
    expect(buildTriageListArgs('cookies', 'Unknown', 0)).toEqual({
      status: 'NEEDS_REVIEW',
      first: COOKIE_TRIAGE_UI_PAGE_SIZE,
      offset: 0,
      orderField: 'occurrences',
      orderDirection: 'DESC',
      trackingPurposes: ['Unknown'],
    });
  });

  it('filters data flows by trackingTypes, including Unknown and custom slugs', () => {
    expect(buildTriageListArgs('data_flows', 'Analytics', 0)).toMatchObject({
      trackingTypes: ['Analytics'],
    });
    expect(buildTriageListArgs('data_flows', 'Custom', 0, ['Loyalty'])).toMatchObject({
      trackingTypes: ['Loyalty'],
    });
    expect(buildTriageListArgs('data_flows', 'Unknown', 0)).toMatchObject({
      trackingTypes: ['Unknown'],
    });
  });
});

describe('purpose count args', () => {
  it('reuses purpose filters with first: 1 for tab badges', () => {
    expect(buildTriagePurposeCountArgs('cookies', 'Advertising')).toEqual({
      status: 'NEEDS_REVIEW',
      first: 1,
      offset: 0,
      orderField: 'occurrences',
      orderDirection: 'DESC',
      trackingPurposes: ['Advertising'],
    });
    expect(buildTriagePurposeCountArgs('cookies', 'Custom', ['Loyalty'])).toEqual({
      status: 'NEEDS_REVIEW',
      first: 1,
      offset: 0,
      orderField: 'occurrences',
      orderDirection: 'DESC',
      trackingPurposes: ['Loyalty'],
    });
    expect(buildTriagePurposeCountArgs('data_flows', 'Analytics')).toMatchObject({
      first: 1,
      trackingTypes: ['Analytics'],
    });
  });
});

describe('summary count args', () => {
  it('requests a single-row NEEDS_REVIEW page for the pending total', () => {
    expect(buildTriagePendingCountArgs()).toEqual({
      status: 'NEEDS_REVIEW',
      first: 1,
      offset: 0,
    });
  });

  it('filters dormant counts to lastDiscoveredAt before the 30-day cutoff', () => {
    const now = Date.parse('2026-09-03T12:00:00.000Z');
    expect(buildTriageDormantCountArgs(now)).toEqual({
      status: 'NEEDS_REVIEW',
      first: 1,
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
    trackingPurposes: ['Analytics'],
  };
  const dataFlow = {
    name: 'example.com',
    id: 'df-1',
    trackingPurposes: ['Advertising'],
  };

  it('approves cookies as LIVE with existing purposes', () => {
    expect(buildTriageUpdateArgs('cookies', cookie, 'approve')).toEqual({
      cookies: [
        {
          name: '_ga',
          status: 'LIVE',
          isJunk: false,
          trackingPurposes: ['Analytics'],
        },
      ],
    });
  });

  it('junks cookies as LIVE + isJunk', () => {
    expect(buildTriageUpdateArgs('cookies', cookie, 'junk')).toEqual({
      cookies: [{ name: '_ga', status: 'LIVE', isJunk: true }],
    });
  });

  it('undoes cookies back to NEEDS_REVIEW', () => {
    expect(buildTriageUpdateArgs('cookies', cookie, undefined)).toEqual({
      cookies: [{ name: '_ga', status: 'NEEDS_REVIEW', isJunk: false }],
    });
  });

  it('updates data flows by id', () => {
    expect(buildTriageUpdateArgs('data_flows', dataFlow, 'approve')).toEqual({
      dataFlows: [
        {
          id: 'df-1',
          status: 'LIVE',
          isJunk: false,
          trackingPurposes: ['Advertising'],
        },
      ],
    });
    expect(buildTriageUpdateArgs('data_flows', dataFlow, 'junk')).toEqual({
      dataFlows: [{ id: 'df-1', status: 'LIVE', isJunk: true }],
    });
    expect(buildTriageUpdateArgs('data_flows', dataFlow, undefined)).toEqual({
      dataFlows: [{ id: 'df-1', status: 'NEEDS_REVIEW', isJunk: false }],
    });
  });
});

describe('buildTriageNotesUpdateArgs', () => {
  const cookie = {
    name: '_ga',
    id: 'cookie-1',
    trackingPurposes: ['Analytics'],
  };
  const dataFlow = {
    name: 'example.com',
    id: 'df-1',
    trackingPurposes: ['Advertising'],
  };

  it('writes description for cookies and data flows', () => {
    expect(buildTriageNotesUpdateArgs('cookies', cookie, 'team note')).toEqual({
      cookies: [{ name: '_ga', description: 'team note' }],
    });
    expect(buildTriageNotesUpdateArgs('data_flows', dataFlow, '')).toEqual({
      dataFlows: [{ id: 'df-1', description: '' }],
    });
  });
});

describe('buildTriagePurposesUpdateArgs', () => {
  const cookie = {
    name: '_ga',
    id: 'cookie-1',
    trackingPurposes: ['Analytics'],
  };
  const dataFlow = {
    name: 'example.com',
    id: 'df-1',
    trackingPurposes: ['Advertising'],
  };

  it('writes trackingPurposes for cookies and data flows', () => {
    expect(buildTriagePurposesUpdateArgs('cookies', cookie, ['Essential'])).toEqual({
      cookies: [{ name: '_ga', trackingPurposes: ['Essential'] }],
    });
    expect(buildTriagePurposesUpdateArgs('data_flows', dataFlow, ['Functional'])).toEqual({
      dataFlows: [{ id: 'df-1', trackingPurposes: ['Functional'] }],
    });
  });
});
