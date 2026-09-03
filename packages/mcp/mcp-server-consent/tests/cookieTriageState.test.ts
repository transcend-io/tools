import { describe, expect, it } from 'vitest';

import type { CookieTriageAnalysis } from '../src/lib/cookieTriageTypes.js';
import {
  buildAskOpinionPrompt,
  canUndoRow,
  cookieTriageReducer,
  createEmptySession,
  decisionReadLabel,
  formatCategorySummaryLine,
  formatEncounters,
  formatLastActivity,
  isDormantCookie,
  selectCategorySummary,
  selectCustomPurposeSlugs,
  selectPurposes,
  selectSummary,
  type CookieTriageSessionState,
} from '../src/ui/cookie-triage/cookieTriageState.js';

const analyticsCookies: CookieTriageAnalysis[] = [
  {
    name: '_ga',
    id: 'analytics-ga',
    trackingPurposes: ['Analytics'],
    lastActivityAt: '2026-08-26T17:22:08.000Z',
  },
  {
    name: '_stale',
    id: 'analytics-stale',
    trackingPurposes: ['Analytics'],
    lastActivityAt: '2025-01-01T00:00:00.000Z',
  },
];

function seedPurpose(
  state: CookieTriageSessionState,
  purpose: 'Analytics' | 'Custom' | 'Unknown' | 'Essential' | 'Advertising',
  items: CookieTriageAnalysis[],
  totalCount = items.length,
): CookieTriageSessionState {
  return cookieTriageReducer(state, {
    type: 'appendPage',
    purpose,
    items,
    fetchedCount: items.length,
    totalCount,
    hasNextPage: false,
  });
}

function seededSession(): CookieTriageSessionState {
  let state = createEmptySession('cookies');
  state = seedPurpose(state, 'Analytics', analyticsCookies);
  state = seedPurpose(state, 'Unknown', [{ name: '_unknown', id: 'unknown-1' }]);
  return state;
}

describe('createEmptySession', () => {
  it('seeds every purpose tab idle with Essential selected', () => {
    const state = createEmptySession('cookies');

    expect(state.triageType).toBe('cookies');
    expect(state.selectedPurpose).toBe('Essential');
    expect(state.purposeOptions.map((option) => option.slug)).toEqual([
      'Essential',
      'Functional',
      'Advertising',
      'Analytics',
      'SaleOfInfo',
    ]);
    expect(selectPurposes(state)).toEqual([
      'Essential',
      'Functional',
      'Advertising',
      'Analytics',
      'SaleOfInfo',
      'Unknown',
      'Custom',
    ]);
    expect(state.purposeOptionsLoaded).toBe(false);
    expect(selectCustomPurposeSlugs(state.purposeOptions)).toEqual([]);
    expect(state.categories.Analytics.loadStatus).toBe('idle');
    expect(state.categories.Analytics.cookies).toEqual([]);
    expect(state.categories.Analytics.nextOffset).toBe(0);
    expect(state.categories.Analytics.hasNextPage).toBe(true);
  });
});

describe('appendPage', () => {
  it('clones rows onto the matching purpose tab', () => {
    const item: CookieTriageAnalysis = {
      name: '_ga',
      id: 'ga-1',
      trackingPurposes: ['Analytics'],
      description: 'session analytics',
    };
    const state = seedPurpose(createEmptySession('cookies'), 'Analytics', [item], 2);

    expect(state.categories.Analytics.cookies).toEqual([
      { name: '_ga', initial: item, notes: 'session analytics' },
    ]);
    expect(state.categories.Analytics.cookies[0]?.initial).not.toBe(item);
    expect(state.categories.Analytics.totalCount).toBe(2);
    expect(state.categories.Analytics.nextOffset).toBe(1);
    expect(state.categories.Analytics.loadStatus).toBe('ready');
    expect(state.categories.Analytics.cookies[0]?.decision).toBeUndefined();
  });

  it('keeps only rows whose primary purpose matches the tab', () => {
    const state = seedPurpose(createEmptySession('cookies'), 'Advertising', [
      { name: 'ads', id: 'ads-1', trackingPurposes: ['Advertising'] },
      { name: 'also-essential', id: 'ads-2', trackingPurposes: ['Essential', 'Advertising'] },
    ]);

    expect(state.categories.Advertising.cookies.map((row) => row.name)).toEqual(['ads']);
  });

  it('skips rows already present in the session', () => {
    let state = seedPurpose(createEmptySession('cookies'), 'Analytics', [
      { name: '_ga', id: 'c1', trackingPurposes: ['Analytics'] },
    ]);
    state = seedPurpose(state, 'Analytics', [
      { name: '_ga', id: 'c1', trackingPurposes: ['Analytics'] },
      { name: '_gid', id: 'c2', trackingPurposes: ['Analytics'] },
    ]);

    expect(state.categories.Analytics.cookies.map((row) => row.name)).toEqual(['_ga', '_gid']);
  });

  it('uses API totalCount for Unknown and Custom', () => {
    const unknownState = cookieTriageReducer(createEmptySession('cookies'), {
      type: 'appendPage',
      purpose: 'Unknown',
      items: [
        { name: '_unknown', id: 'u1' },
        { name: '_ga', id: 'ga-1', trackingPurposes: ['Analytics'] },
      ],
      fetchedCount: 20,
      totalCount: 400,
      hasNextPage: true,
    });

    expect(unknownState.categories.Unknown.cookies).toHaveLength(1);
    expect(unknownState.categories.Unknown.totalCount).toBe(400);
    expect(unknownState.categories.Unknown.nextOffset).toBe(20);
    expect(unknownState.categories.Unknown.hasNextPage).toBe(true);

    const customState = cookieTriageReducer(createEmptySession('cookies'), {
      type: 'appendPage',
      purpose: 'Custom',
      items: [
        { name: '_loyalty', id: 'l1', trackingPurposes: ['Loyalty'] },
        { name: '_ga', id: 'ga-1', trackingPurposes: ['Analytics'] },
      ],
      fetchedCount: 20,
      totalCount: 400,
      hasNextPage: true,
    });

    expect(customState.categories.Custom.cookies).toHaveLength(1);
    expect(customState.categories.Custom.totalCount).toBe(400);
  });

  it('claims Custom rows that also have a default purpose, even if already on that tab', () => {
    let state = seedPurpose(createEmptySession('cookies'), 'Advertising', [
      {
        name: 'c_review-me',
        id: 'mixed-1',
        trackingPurposes: ['CustomPurpose', 'Advertising'],
      },
    ]);

    state = cookieTriageReducer(state, {
      type: 'appendPage',
      purpose: 'Custom',
      items: [
        {
          name: 'c_review-me',
          id: 'mixed-1',
          trackingPurposes: ['CustomPurpose', 'Advertising'],
        },
        {
          name: "'review-me",
          id: 'custom-only-1',
          trackingPurposes: ['ProductUpdates'],
        },
      ],
      fetchedCount: 2,
      totalCount: 2,
      hasNextPage: false,
    });

    expect(state.categories.Custom.cookies.map((row) => row.name)).toEqual([
      'c_review-me',
      "'review-me",
    ]);
    expect(state.categories.Advertising.cookies.map((row) => row.name)).toEqual(['c_review-me']);
    expect(state.categories.Custom.totalCount).toBe(2);
  });
});

describe('selectSummary', () => {
  it('uses API summary totals and session decisions for overview KPIs', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'setSummaryTotals',
      pendingTotal: 606,
      dormantTotal: 42,
    });

    expect(selectSummary(state)).toEqual({
      pendingCount: 606,
      dormantCount: 42,
      triagedCount: 0,
    });

    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: 'Analytics',
      name: '_ga',
      decision: 'approve',
    });

    expect(selectSummary(state)).toEqual({
      pendingCount: 606,
      dormantCount: 42,
      triagedCount: 1,
    });
  });

  it('treats missing API totals as zero until count calls land', () => {
    expect(selectSummary(seededSession())).toEqual({
      pendingCount: 0,
      dormantCount: 0,
      triagedCount: 0,
    });
  });
});

describe('isDormantCookie', () => {
  it('returns true when last activity is older than 30 days', () => {
    expect(
      isDormantCookie({
        name: 'x',
        id: 'x-1',
        lastActivityAt: '2025-01-01T00:00:00.000Z',
      }),
    ).toBe(true);
  });
});

describe('cookieTriageReducer', () => {
  it('records a decision for one row within its purpose category', () => {
    let state = seededSession();

    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: 'Analytics',
      name: '_ga',
      decision: 'approve',
    });

    expect(state.categories.Analytics.cookies.find((row) => row.name === '_ga')?.decision).toBe(
      'approve',
    );
    expect(selectSummary(state).triagedCount).toBe(1);
  });

  it('updates notes for one row without changing its decision', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: 'Analytics',
      name: '_ga',
      decision: 'approve',
    });
    state = cookieTriageReducer(state, {
      type: 'setNotes',
      purpose: 'Analytics',
      name: '_ga',
      notes: 'owned by growth',
    });

    const row = state.categories.Analytics.cookies.find((candidate) => candidate.name === '_ga');
    expect(row?.notes).toBe('owned by growth');
    expect(row?.decision).toBe('approve');
  });

  it('reverts a row to its initial pending state on undo', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: 'Analytics',
      name: '_ga',
      decision: 'approve',
    });

    const row = state.categories.Analytics.cookies.find((candidate) => candidate.name === '_ga')!;
    expect(canUndoRow(row)).toBe(true);

    state = cookieTriageReducer(state, { type: 'undo', purpose: 'Analytics', name: '_ga' });

    expect(
      state.categories.Analytics.cookies.find((candidate) => candidate.name === '_ga')?.decision,
    ).toBeUndefined();
    expect(
      canUndoRow(state.categories.Analytics.cookies.find((candidate) => candidate.name === '_ga')!),
    ).toBe(false);
  });

  it('reuses unchanged category cookie objects when updating one row', () => {
    const state = seededSession();
    const unchanged = state.categories.Unknown.cookies[0];

    const next = cookieTriageReducer(state, {
      type: 'decide',
      purpose: 'Analytics',
      name: '_ga',
      decision: 'approve',
    });

    expect(next.categories.Unknown.cookies[0]).toBe(unchanged);
    expect(next.categories.Analytics.cookies.find((row) => row.name === '_ga')).not.toBe(
      state.categories.Analytics.cookies.find((row) => row.name === '_ga'),
    );
    expect(next.categories.Analytics).not.toBe(state.categories.Analytics);
    expect(next.selectedPurpose).toBe(state.selectedPurpose);
  });

  it('updates the selected purpose tab', () => {
    let state = createEmptySession('cookies');
    expect(state.selectedPurpose).toBe('Essential');

    state = cookieTriageReducer(state, { type: 'selectPurpose', purpose: 'Unknown' });
    expect(state.selectedPurpose).toBe('Unknown');
  });

  it('ignores selecting the already-selected purpose', () => {
    const state = createEmptySession('cookies');

    expect(cookieTriageReducer(state, { type: 'selectPurpose', purpose: 'Essential' })).toBe(state);
  });

  it('tracks loadStart and loadError on a tab', () => {
    let state = createEmptySession('cookies');
    state = cookieTriageReducer(state, { type: 'loadStart', purpose: 'Analytics' });
    expect(state.categories.Analytics.loadStatus).toBe('loading');

    state = cookieTriageReducer(state, {
      type: 'loadError',
      purpose: 'Analytics',
      error: 'boom',
    });
    expect(state.categories.Analytics.loadStatus).toBe('error');
    expect(state.categories.Analytics.loadError).toBe('boom');
  });

  it('updates tracking purposes in place when the primary tab is unchanged', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'setTrackingPurposes',
      purpose: 'Analytics',
      name: '_ga',
      trackingPurposes: ['Analytics', 'SaleOfInfo'],
    });

    expect(
      state.categories.Analytics.cookies.find((row) => row.name === '_ga')?.initial
        .trackingPurposes,
    ).toEqual(['Analytics', 'SaleOfInfo']);
    expect(state.categories.SaleOfInfo.cookies.find((row) => row.name === '_ga')).toBeUndefined();
  });

  it('keeps the row on its current tab when the assigned purpose changes', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'setTrackingPurposes',
      purpose: 'Analytics',
      name: '_ga',
      trackingPurposes: ['Essential'],
    });

    expect(
      state.categories.Analytics.cookies.find((row) => row.name === '_ga')?.initial
        .trackingPurposes,
    ).toEqual(['Essential']);
    expect(state.categories.Essential.cookies.find((row) => row.name === '_ga')).toBeUndefined();
  });

  it('stores org purpose options from consent_list_purposes', () => {
    let state = createEmptySession('cookies');
    state = cookieTriageReducer(state, {
      type: 'setPurposeOptions',
      purposeOptions: [
        { slug: 'Essential', label: 'Essential' },
        { slug: 'CustomPurpose', label: 'Custom Purpose' },
      ],
    });
    expect(state.purposeOptions).toEqual([
      { slug: 'Essential', label: 'Essential' },
      { slug: 'CustomPurpose', label: 'Custom Purpose' },
    ]);
    expect(state.purposeOptionsLoaded).toBe(true);
    expect(selectPurposes(state)).toContain('Custom');
  });

  it('hides the Custom tab after purposes load with only defaults', () => {
    let state = createEmptySession('cookies');
    state = cookieTriageReducer(state, { type: 'selectPurpose', purpose: 'Custom' });
    state = cookieTriageReducer(state, {
      type: 'setPurposeOptions',
      purposeOptions: [{ slug: 'Essential', label: 'Essential' }],
    });

    expect(selectPurposes(state)).not.toContain('Custom');
    expect(state.selectedPurpose).toBe('Unknown');
  });

  it('keeps decided overlays and clears pending rows on refreshStart', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: 'Analytics',
      name: '_ga',
      decision: 'approve',
    });
    state = cookieTriageReducer(state, {
      type: 'appendPage',
      purpose: 'Analytics',
      items: [{ name: '_gid', id: 'gid-1', trackingPurposes: ['Analytics'] }],
      fetchedCount: 1,
      totalCount: 3,
      hasNextPage: true,
    });

    state = cookieTriageReducer(state, { type: 'refreshStart', purpose: 'Analytics' });

    expect(state.categories.Analytics.cookies.map((row) => row.name)).toEqual(['_ga']);
    expect(state.categories.Analytics.cookies[0]?.decision).toBe('approve');
    expect(state.categories.Analytics.nextOffset).toBe(0);
    expect(state.categories.Analytics.hasNextPage).toBe(true);
    expect(state.categories.Analytics.loadStatus).toBe('loading');
    expect(canUndoRow(state.categories.Analytics.cookies[0]!)).toBe(true);
  });

  it('replays pending rows after refresh while preserving undoable decided overlays', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: 'Analytics',
      name: '_ga',
      decision: 'junk',
    });
    state = cookieTriageReducer(state, { type: 'refreshStart', purpose: 'Analytics' });
    state = cookieTriageReducer(state, {
      type: 'appendPage',
      purpose: 'Analytics',
      items: [
        {
          name: '_fresh',
          id: 'fresh-1',
          trackingPurposes: ['Analytics'],
          description: 'new pending',
        },
      ],
      fetchedCount: 1,
      totalCount: 10,
      hasNextPage: false,
    });

    expect(state.categories.Analytics.cookies.map((row) => row.name)).toEqual(['_ga', '_fresh']);
    expect(state.categories.Analytics.cookies[0]?.decision).toBe('junk');
    expect(state.categories.Analytics.cookies[1]?.decision).toBeUndefined();
    expect(state.categories.Analytics.cookies[1]?.notes).toBe('new pending');
    expect(state.categories.Analytics.totalCount).toBe(10);
    expect(state.categories.Analytics.loadStatus).toBe('ready');

    state = cookieTriageReducer(state, { type: 'undo', purpose: 'Analytics', name: '_ga' });
    expect(
      state.categories.Analytics.cookies.find((row) => row.name === '_ga')?.decision,
    ).toBeUndefined();
  });

  it('revives a decided overlay when the API returns it as NEEDS_REVIEW again', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: 'Analytics',
      name: '_ga',
      decision: 'approve',
    });
    state = cookieTriageReducer(state, { type: 'refreshStart', purpose: 'Analytics' });
    state = cookieTriageReducer(state, {
      type: 'appendPage',
      purpose: 'Analytics',
      items: [
        {
          name: '_ga',
          id: 'analytics-ga',
          trackingPurposes: ['Analytics'],
          description: 'back in review',
          occurrences: 99,
        },
      ],
      fetchedCount: 1,
      totalCount: 1,
      hasNextPage: false,
    });

    const row = state.categories.Analytics.cookies.find((candidate) => candidate.name === '_ga');
    expect(state.categories.Analytics.cookies).toHaveLength(1);
    expect(row?.decision).toBeUndefined();
    expect(row?.notes).toBe('back in review');
    expect(row?.initial.occurrences).toBe(99);
    expect(canUndoRow(row!)).toBe(false);
  });

  it('updates totalCount from setCategoryCount and can defer list load after refresh', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: 'Analytics',
      name: '_ga',
      decision: 'approve',
    });
    state = cookieTriageReducer(state, { type: 'refreshStart', purpose: 'Analytics' });
    state = cookieTriageReducer(state, {
      type: 'setCategoryCount',
      purpose: 'Analytics',
      totalCount: 42,
      deferListLoad: true,
    });

    expect(state.categories.Analytics.totalCount).toBe(42);
    expect(state.categories.Analytics.loadStatus).toBe('idle');
    expect(state.categories.Analytics.cookies.map((row) => row.name)).toEqual(['_ga']);
    expect(state.categories.Analytics.loadError).toBeUndefined();

    state = cookieTriageReducer(state, {
      type: 'setCategoryCount',
      purpose: 'Essential',
      totalCount: 7,
    });
    expect(state.categories.Essential.totalCount).toBe(7);
    expect(state.categories.Essential.loadStatus).toBe('idle');
  });
});

describe('format helpers', () => {
  it('formats encounters and relative last activity', () => {
    expect(formatEncounters(31204)).toBe('31,204');
    expect(formatEncounters(undefined)).toBe('—');
    expect(decisionReadLabel('approve')).toBe('Approved');
    expect(decisionReadLabel('junk')).toBe('Junked');

    const now = Date.parse('2026-08-27T12:00:00.000Z');
    expect(formatLastActivity('2026-08-27T11:48:00.000Z', now)).toBe('12 minutes ago');
    expect(formatLastActivity(undefined, now)).toBe('—');
  });

  it('builds category summary lines', () => {
    const state = seededSession();
    const summary = selectCategorySummary(state.categories.Analytics);

    expect(summary).toEqual({
      pendingCount: 2,
      dormantCount: 1,
      triagedCount: 0,
    });
    expect(formatCategorySummaryLine(summary)).toBe('2 pending · 1 dormant, worth a look');
  });

  it('builds an ask-opinion prompt with row context', () => {
    const prompt = buildAskOpinionPrompt({
      triageType: 'cookies',
      purpose: 'Analytics',
      item: {
        name: '_ga',
        id: 'cookie-1',
        service: 'Google Analytics',
        trackingPurposes: ['Analytics'],
        occurrences: 31204,
        lastActivityAt: '2026-08-26T17:22:08.000Z',
      },
    });

    expect(prompt).toContain('this cookie needing review');
    expect(prompt).toContain('Name: _ga');
    expect(prompt).toContain('Service: Google Analytics');
    expect(prompt).toContain('Assigned purposes: Analytics');
    expect(prompt).toContain('Primary purpose tab: Analytics');
    expect(prompt).toContain('Recommend one of: approve, junk, or review.');
  });
});
