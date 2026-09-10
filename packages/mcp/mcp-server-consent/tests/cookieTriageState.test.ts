import { describe, expect, it } from 'vitest';

import { CookieTriagePurposeCategory } from '../src/lib/cookieTriageConfig.js';
import {
  ConsentTriageType,
  CookieTriageDecision,
  CookieTriageLoadStatus,
  type CookieTriageAnalysis,
} from '../src/lib/cookieTriageTypes.js';
import {
  buildAskOpinionPrompt,
  canUndoRow,
  cookieTriageReducer,
  createEmptySession,
  decisionReadLabel,
  formatApplySuggestionsLabel,
  formatCategorySummaryLine,
  formatUndoSuggestionsLabel,
  selectUndoableAppliedNames,
  formatEncounters,
  formatLastActivity,
  hasAssignedPurpose,
  hasMinimalOccurrences,
  isDormantCookie,
  selectCategorySummary,
  selectCustomPurposeSlugs,
  selectPurposes,
  selectSummary,
  suggestRowDecision,
  suggestTriageDecision,
  type CookieTriageSessionState,
} from '../src/ui/cookie-triage/cookieTriageState.js';

const recentActivityAt = '2026-08-26T17:22:08.000Z';
const staleActivityAt = '2025-01-01T00:00:00.000Z';

const analyticsCookies: CookieTriageAnalysis[] = [
  {
    name: '_ga',
    id: 'analytics-ga',
    trackingPurposes: [CookieTriagePurposeCategory.Analytics],
    occurrences: 31204,
    lastActivityAt: recentActivityAt,
  },
  {
    name: '_stale',
    id: 'analytics-stale',
    trackingPurposes: [CookieTriagePurposeCategory.Analytics],
    occurrences: 12,
    lastActivityAt: staleActivityAt,
  },
];

function seedPurpose(
  state: CookieTriageSessionState,
  purpose: CookieTriagePurposeCategory,
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
  let state = createEmptySession(ConsentTriageType.Cookies);
  state = seedPurpose(state, CookieTriagePurposeCategory.Analytics, analyticsCookies);
  state = seedPurpose(state, CookieTriagePurposeCategory.Unknown, [
    { name: '_unknown', id: 'unknown-1' },
  ]);
  return state;
}

describe('createEmptySession', () => {
  it('seeds every purpose tab idle with Essential selected', () => {
    const state = createEmptySession(ConsentTriageType.Cookies);

    expect(state.triageType).toBe(ConsentTriageType.Cookies);
    expect(state.selectedPurpose).toBe(CookieTriagePurposeCategory.Essential);
    expect(state.purposeOptions.map((option) => option.slug)).toEqual([
      CookieTriagePurposeCategory.Essential,
      CookieTriagePurposeCategory.Functional,
      CookieTriagePurposeCategory.Advertising,
      CookieTriagePurposeCategory.Analytics,
      CookieTriagePurposeCategory.SaleOfInfo,
    ]);
    expect(selectPurposes(state)).toEqual([
      CookieTriagePurposeCategory.Essential,
      CookieTriagePurposeCategory.Functional,
      CookieTriagePurposeCategory.Advertising,
      CookieTriagePurposeCategory.Analytics,
      CookieTriagePurposeCategory.SaleOfInfo,
      CookieTriagePurposeCategory.Unknown,
      CookieTriagePurposeCategory.Custom,
    ]);
    expect(state.purposeOptionsLoaded).toBe(false);
    expect(selectCustomPurposeSlugs(state.purposeOptions)).toEqual([]);
    expect(state.categories.Analytics.loadStatus).toBe(CookieTriageLoadStatus.Idle);
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
      trackingPurposes: [CookieTriagePurposeCategory.Analytics],
      description: 'session analytics',
    };
    const state = seedPurpose(
      createEmptySession(ConsentTriageType.Cookies),
      CookieTriagePurposeCategory.Analytics,
      [item],
      2,
    );

    expect(state.categories.Analytics.cookies).toEqual([
      { name: '_ga', initial: item, notes: 'session analytics' },
    ]);
    expect(state.categories.Analytics.cookies[0]?.initial).not.toBe(item);
    expect(state.categories.Analytics.totalCount).toBe(2);
    expect(state.categories.Analytics.nextOffset).toBe(1);
    expect(state.categories.Analytics.loadStatus).toBe(CookieTriageLoadStatus.Ready);
    expect(state.categories.Analytics.cookies[0]?.decision).toBeUndefined();
  });

  it('keeps rows that include the tab purpose, including mixed-purpose items', () => {
    const state = seedPurpose(
      createEmptySession(ConsentTriageType.Cookies),
      CookieTriagePurposeCategory.Advertising,
      [
        { name: 'ads', id: 'ads-1', trackingPurposes: [CookieTriagePurposeCategory.Advertising] },
        {
          name: 'also-essential',
          id: 'ads-2',
          trackingPurposes: [
            CookieTriagePurposeCategory.Essential,
            CookieTriagePurposeCategory.Advertising,
          ],
        },
        {
          name: 'analytics-only',
          id: 'ads-3',
          trackingPurposes: [CookieTriagePurposeCategory.Analytics],
        },
      ],
    );

    expect(state.categories.Advertising.cookies.map((row) => row.name)).toEqual([
      'ads',
      'also-essential',
    ]);
  });

  it('shows the same mixed-purpose item on every matching purpose tab', () => {
    let state = seedPurpose(
      createEmptySession(ConsentTriageType.Cookies),
      CookieTriagePurposeCategory.Essential,
      [
        {
          name: 'mixed',
          id: 'mixed-1',
          trackingPurposes: [
            CookieTriagePurposeCategory.Essential,
            CookieTriagePurposeCategory.Advertising,
          ],
        },
      ],
    );
    state = seedPurpose(state, CookieTriagePurposeCategory.Advertising, [
      {
        name: 'mixed',
        id: 'mixed-1',
        trackingPurposes: [
          CookieTriagePurposeCategory.Essential,
          CookieTriagePurposeCategory.Advertising,
        ],
      },
    ]);

    expect(state.categories.Essential.cookies.map((row) => row.name)).toEqual(['mixed']);
    expect(state.categories.Advertising.cookies.map((row) => row.name)).toEqual(['mixed']);
  });

  it('skips rows already present on the same tab', () => {
    let state = seedPurpose(
      createEmptySession(ConsentTriageType.Cookies),
      CookieTriagePurposeCategory.Analytics,
      [{ name: '_ga', id: 'c1', trackingPurposes: [CookieTriagePurposeCategory.Analytics] }],
    );
    state = seedPurpose(state, CookieTriagePurposeCategory.Analytics, [
      { name: '_ga', id: 'c1', trackingPurposes: [CookieTriagePurposeCategory.Analytics] },
      { name: '_gid', id: 'c2', trackingPurposes: [CookieTriagePurposeCategory.Analytics] },
    ]);

    expect(state.categories.Analytics.cookies.map((row) => row.name)).toEqual(['_ga', '_gid']);
  });

  it('uses API totalCount for Unknown and Custom', () => {
    const unknownState = cookieTriageReducer(createEmptySession(ConsentTriageType.Cookies), {
      type: 'appendPage',
      purpose: CookieTriagePurposeCategory.Unknown,
      items: [
        { name: '_unknown', id: 'u1' },
        { name: '_ga', id: 'ga-1', trackingPurposes: [CookieTriagePurposeCategory.Analytics] },
      ],
      fetchedCount: 20,
      totalCount: 400,
      hasNextPage: true,
    });

    expect(unknownState.categories.Unknown.cookies).toHaveLength(1);
    expect(unknownState.categories.Unknown.totalCount).toBe(400);
    expect(unknownState.categories.Unknown.nextOffset).toBe(20);
    expect(unknownState.categories.Unknown.hasNextPage).toBe(true);

    const customState = cookieTriageReducer(createEmptySession(ConsentTriageType.Cookies), {
      type: 'appendPage',
      purpose: CookieTriagePurposeCategory.Custom,
      items: [
        { name: '_loyalty', id: 'l1', trackingPurposes: ['Loyalty'] },
        { name: '_ga', id: 'ga-1', trackingPurposes: [CookieTriagePurposeCategory.Analytics] },
      ],
      fetchedCount: 20,
      totalCount: 400,
      hasNextPage: true,
    });

    expect(customState.categories.Custom.cookies).toHaveLength(1);
    expect(customState.categories.Custom.totalCount).toBe(400);
  });

  it('claims Custom rows that also have a default purpose, even if already on that tab', () => {
    let state = seedPurpose(
      createEmptySession(ConsentTriageType.Cookies),
      CookieTriagePurposeCategory.Advertising,
      [
        {
          name: 'c_review-me',
          id: 'mixed-1',
          trackingPurposes: ['CustomPurpose', CookieTriagePurposeCategory.Advertising],
        },
      ],
    );

    state = cookieTriageReducer(state, {
      type: 'appendPage',
      purpose: CookieTriagePurposeCategory.Custom,
      items: [
        {
          name: 'c_review-me',
          id: 'mixed-1',
          trackingPurposes: ['CustomPurpose', CookieTriagePurposeCategory.Advertising],
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
      summaryBusy: false,
    });

    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_ga',
      decision: CookieTriageDecision.Approve,
    });

    expect(selectSummary(state)).toEqual({
      pendingCount: 606,
      dormantCount: 42,
      triagedCount: 1,
      summaryBusy: false,
    });
  });

  it('treats missing API totals as zero until count calls land', () => {
    expect(selectSummary(seededSession())).toEqual({
      pendingCount: 0,
      dormantCount: 0,
      triagedCount: 0,
      summaryBusy: true,
    });
  });

  it('marks overview KPIs busy while summary counts refresh', () => {
    let state = cookieTriageReducer(seededSession(), {
      type: 'setSummaryTotals',
      pendingTotal: 10,
      dormantTotal: 2,
    });
    expect(selectSummary(state).summaryBusy).toBe(false);

    state = cookieTriageReducer(state, { type: 'summaryLoadStart' });
    expect(selectSummary(state).summaryBusy).toBe(true);
    expect(selectSummary(state).pendingCount).toBe(10);
  });
});

describe('isDormantCookie', () => {
  it('returns true when last activity is older than 30 days', () => {
    expect(
      isDormantCookie({
        name: 'x',
        id: 'x-1',
        lastActivityAt: staleActivityAt,
      }),
    ).toBe(true);
  });
});

describe('suggestTriageDecision', () => {
  it('suggests junk when purpose is missing or Unknown', () => {
    expect(
      suggestTriageDecision({
        name: 'a',
        id: 'a',
        occurrences: 99,
        lastActivityAt: recentActivityAt,
      }),
    ).toBe(CookieTriageDecision.Junk);
    expect(
      suggestTriageDecision({
        name: 'b',
        id: 'b',
        trackingPurposes: [CookieTriagePurposeCategory.Unknown],
        occurrences: 99,
        lastActivityAt: recentActivityAt,
      }),
    ).toBe(CookieTriageDecision.Junk);
    expect(
      hasAssignedPurpose({
        name: 'b',
        id: 'b',
        trackingPurposes: [CookieTriagePurposeCategory.Unknown],
      }),
    ).toBe(false);
  });

  it('suggests junk when dormant even with purpose and volume', () => {
    expect(
      suggestTriageDecision({
        name: 'stale',
        id: 'stale',
        trackingPurposes: [CookieTriagePurposeCategory.Analytics],
        occurrences: 99,
        lastActivityAt: staleActivityAt,
      }),
    ).toBe(CookieTriageDecision.Junk);
  });

  it('suggests junk for minimal or missing occurrences', () => {
    expect(
      suggestTriageDecision({
        name: 'low',
        id: 'low',
        trackingPurposes: [CookieTriagePurposeCategory.Analytics],
        occurrences: 4,
        lastActivityAt: recentActivityAt,
      }),
    ).toBe(CookieTriageDecision.Junk);
    expect(
      suggestTriageDecision({
        name: 'zero',
        id: 'zero',
        trackingPurposes: [CookieTriagePurposeCategory.Analytics],
        occurrences: 0,
        lastActivityAt: recentActivityAt,
      }),
    ).toBe(CookieTriageDecision.Junk);
    expect(
      hasMinimalOccurrences({
        name: 'missing',
        id: 'missing',
        trackingPurposes: [CookieTriagePurposeCategory.Analytics],
        lastActivityAt: recentActivityAt,
      }),
    ).toBe(true);
    expect(
      suggestTriageDecision({
        name: 'missing',
        id: 'missing',
        trackingPurposes: [CookieTriagePurposeCategory.Analytics],
        lastActivityAt: recentActivityAt,
      }),
    ).toBe(CookieTriageDecision.Junk);
  });

  it('suggests approve when purpose, recent activity, and enough occurrences align', () => {
    expect(
      suggestTriageDecision({
        name: 'healthy',
        id: 'healthy',
        trackingPurposes: [CookieTriagePurposeCategory.Analytics],
        occurrences: 5,
        lastActivityAt: recentActivityAt,
      }),
    ).toBe(CookieTriageDecision.Approve);
  });

  it('excludes decided rows from suggestRowDecision', () => {
    expect(
      suggestRowDecision({
        name: '_ga',
        initial: analyticsCookies[0],
        decision: CookieTriageDecision.Approve,
        notes: '',
      }),
    ).toBeUndefined();
    expect(
      suggestRowDecision({
        name: '_ga',
        initial: analyticsCookies[0],
        notes: '',
      }),
    ).toBe(CookieTriageDecision.Approve);
  });
});

describe('cookieTriageReducer', () => {
  it('records a decision for one row within its purpose category', () => {
    let state = seededSession();

    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_ga',
      decision: CookieTriageDecision.Approve,
    });

    expect(state.categories.Analytics.cookies.find((row) => row.name === '_ga')?.decision).toBe(
      CookieTriageDecision.Approve,
    );
    expect(selectSummary(state).triagedCount).toBe(1);
  });

  it('removes a pending row and decrements overview counts', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'setSummaryTotals',
      pendingTotal: 3,
      dormantTotal: 1,
    });

    state = cookieTriageReducer(state, {
      type: 'remove',
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_stale',
    });

    expect(state.categories.Analytics.cookies.map((row) => row.name)).toEqual(['_ga']);
    expect(state.categories.Analytics.totalCount).toBe(1);
    expect(selectSummary(state)).toMatchObject({
      pendingCount: 2,
      dormantCount: 0,
      triagedCount: 0,
    });
  });

  it('updates notes for one row without changing its decision', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_ga',
      decision: CookieTriageDecision.Approve,
    });
    state = cookieTriageReducer(state, {
      type: 'setNotes',
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_ga',
      notes: 'owned by growth',
    });

    const row = state.categories.Analytics.cookies.find((candidate) => candidate.name === '_ga');
    expect(row?.notes).toBe('owned by growth');
    expect(row?.decision).toBe(CookieTriageDecision.Approve);
  });

  it('reverts a row to its initial pending state on undo', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_ga',
      decision: CookieTriageDecision.Approve,
    });

    const row = state.categories.Analytics.cookies.find((candidate) => candidate.name === '_ga')!;
    expect(canUndoRow(row)).toBe(true);

    state = cookieTriageReducer(state, {
      type: 'undo',
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_ga',
    });

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
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_ga',
      decision: CookieTriageDecision.Approve,
    });

    expect(next.categories.Unknown.cookies[0]).toBe(unchanged);
    expect(next.categories.Analytics.cookies.find((row) => row.name === '_ga')).not.toBe(
      state.categories.Analytics.cookies.find((row) => row.name === '_ga'),
    );
    expect(next.categories.Analytics).not.toBe(state.categories.Analytics);
    expect(next.selectedPurpose).toBe(state.selectedPurpose);
  });

  it('updates the selected purpose tab', () => {
    let state = createEmptySession(ConsentTriageType.Cookies);
    expect(state.selectedPurpose).toBe(CookieTriagePurposeCategory.Essential);

    state = cookieTriageReducer(state, {
      type: 'selectPurpose',
      purpose: CookieTriagePurposeCategory.Unknown,
    });
    expect(state.selectedPurpose).toBe(CookieTriagePurposeCategory.Unknown);
  });

  it('ignores selecting the already-selected purpose', () => {
    const state = createEmptySession(ConsentTriageType.Cookies);

    expect(
      cookieTriageReducer(state, {
        type: 'selectPurpose',
        purpose: CookieTriagePurposeCategory.Essential,
      }),
    ).toBe(state);
  });

  it('tracks loadStart and loadError on a tab', () => {
    let state = createEmptySession(ConsentTriageType.Cookies);
    state = cookieTriageReducer(state, {
      type: 'loadStart',
      purpose: CookieTriagePurposeCategory.Analytics,
    });
    expect(state.categories.Analytics.loadStatus).toBe(CookieTriageLoadStatus.Loading);

    state = cookieTriageReducer(state, {
      type: 'loadError',
      purpose: CookieTriagePurposeCategory.Analytics,
      error: 'boom',
    });
    expect(state.categories.Analytics.loadStatus).toBe(CookieTriageLoadStatus.Error);
    expect(state.categories.Analytics.loadError).toBe('boom');
  });

  it('updates tracking purposes in place when the primary tab is unchanged', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'setTrackingPurposes',
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_ga',
      trackingPurposes: [
        CookieTriagePurposeCategory.Analytics,
        CookieTriagePurposeCategory.SaleOfInfo,
      ],
    });

    expect(
      state.categories.Analytics.cookies.find((row) => row.name === '_ga')?.initial
        .trackingPurposes,
    ).toEqual([CookieTriagePurposeCategory.Analytics, CookieTriagePurposeCategory.SaleOfInfo]);
    expect(state.categories.SaleOfInfo.cookies.find((row) => row.name === '_ga')).toBeUndefined();
  });

  it('keeps the row on its current tab when the assigned purpose changes', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'setTrackingPurposes',
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_ga',
      trackingPurposes: [CookieTriagePurposeCategory.Essential],
    });

    expect(
      state.categories.Analytics.cookies.find((row) => row.name === '_ga')?.initial
        .trackingPurposes,
    ).toEqual([CookieTriagePurposeCategory.Essential]);
    expect(state.categories.Essential.cookies.find((row) => row.name === '_ga')).toBeUndefined();
  });

  it('stores org purpose options from consent_list_purposes', () => {
    let state = createEmptySession(ConsentTriageType.Cookies);
    state = cookieTriageReducer(state, {
      type: 'setPurposeOptions',
      purposeOptions: [
        { slug: CookieTriagePurposeCategory.Essential, label: 'Essential' },
        { slug: 'CustomPurpose', label: 'Custom Purpose' },
      ],
    });
    expect(state.purposeOptions).toEqual([
      { slug: CookieTriagePurposeCategory.Essential, label: 'Essential' },
      { slug: 'CustomPurpose', label: 'Custom Purpose' },
    ]);
    expect(state.purposeOptionsLoaded).toBe(true);
    expect(selectPurposes(state)).toContain(CookieTriagePurposeCategory.Custom);
  });

  it('hides the Custom tab after purposes load with only defaults', () => {
    let state = createEmptySession(ConsentTriageType.Cookies);
    state = cookieTriageReducer(state, {
      type: 'selectPurpose',
      purpose: CookieTriagePurposeCategory.Custom,
    });
    state = cookieTriageReducer(state, {
      type: 'setPurposeOptions',
      purposeOptions: [{ slug: CookieTriagePurposeCategory.Essential, label: 'Essential' }],
    });

    expect(selectPurposes(state)).not.toContain(CookieTriagePurposeCategory.Custom);
    expect(state.selectedPurpose).toBe(CookieTriagePurposeCategory.Unknown);
  });

  it('keeps decided overlays and clears pending rows on refreshStart', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_ga',
      decision: CookieTriageDecision.Approve,
    });
    state = cookieTriageReducer(state, {
      type: 'appendPage',
      purpose: CookieTriagePurposeCategory.Analytics,
      items: [
        { name: '_gid', id: 'gid-1', trackingPurposes: [CookieTriagePurposeCategory.Analytics] },
      ],
      fetchedCount: 1,
      totalCount: 3,
      hasNextPage: true,
    });

    state = cookieTriageReducer(state, {
      type: 'refreshStart',
      purpose: CookieTriagePurposeCategory.Analytics,
    });

    expect(state.categories.Analytics.cookies.map((row) => row.name)).toEqual(['_ga']);
    expect(state.categories.Analytics.cookies[0]?.decision).toBe(CookieTriageDecision.Approve);
    expect(state.categories.Analytics.nextOffset).toBe(0);
    expect(state.categories.Analytics.hasNextPage).toBe(true);
    expect(state.categories.Analytics.loadStatus).toBe(CookieTriageLoadStatus.Loading);
    expect(canUndoRow(state.categories.Analytics.cookies[0]!)).toBe(true);
  });

  it('replays pending rows after refresh while preserving undoable decided overlays', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_ga',
      decision: CookieTriageDecision.Junk,
    });
    state = cookieTriageReducer(state, {
      type: 'refreshStart',
      purpose: CookieTriagePurposeCategory.Analytics,
    });
    state = cookieTriageReducer(state, {
      type: 'appendPage',
      purpose: CookieTriagePurposeCategory.Analytics,
      items: [
        {
          name: '_fresh',
          id: 'fresh-1',
          trackingPurposes: [CookieTriagePurposeCategory.Analytics],
          description: 'new pending',
        },
      ],
      fetchedCount: 1,
      totalCount: 10,
      hasNextPage: false,
    });

    expect(state.categories.Analytics.cookies.map((row) => row.name)).toEqual(['_ga', '_fresh']);
    expect(state.categories.Analytics.cookies[0]?.decision).toBe(CookieTriageDecision.Junk);
    expect(state.categories.Analytics.cookies[1]?.decision).toBeUndefined();
    expect(state.categories.Analytics.cookies[1]?.notes).toBe('new pending');
    expect(state.categories.Analytics.totalCount).toBe(10);
    expect(state.categories.Analytics.loadStatus).toBe(CookieTriageLoadStatus.Ready);

    state = cookieTriageReducer(state, {
      type: 'undo',
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_ga',
    });
    expect(
      state.categories.Analytics.cookies.find((row) => row.name === '_ga')?.decision,
    ).toBeUndefined();
  });

  it('revives a decided overlay when the API returns it as NEEDS_REVIEW again', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_ga',
      decision: CookieTriageDecision.Approve,
    });
    state = cookieTriageReducer(state, {
      type: 'refreshStart',
      purpose: CookieTriagePurposeCategory.Analytics,
    });
    state = cookieTriageReducer(state, {
      type: 'appendPage',
      purpose: CookieTriagePurposeCategory.Analytics,
      items: [
        {
          name: '_ga',
          id: 'analytics-ga',
          trackingPurposes: [CookieTriagePurposeCategory.Analytics],
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
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_ga',
      decision: CookieTriageDecision.Approve,
    });
    state = cookieTriageReducer(state, {
      type: 'refreshStart',
      purpose: CookieTriagePurposeCategory.Analytics,
    });
    state = cookieTriageReducer(state, {
      type: 'setCategoryCount',
      purpose: CookieTriagePurposeCategory.Analytics,
      totalCount: 42,
      deferListLoad: true,
    });

    expect(state.categories.Analytics.totalCount).toBe(42);
    expect(state.categories.Analytics.loadStatus).toBe(CookieTriageLoadStatus.Idle);
    expect(state.categories.Analytics.cookies.map((row) => row.name)).toEqual(['_ga']);
    expect(state.categories.Analytics.loadError).toBeUndefined();

    state = cookieTriageReducer(state, {
      type: 'setCategoryCount',
      purpose: CookieTriagePurposeCategory.Essential,
      totalCount: 7,
    });
    expect(state.categories.Essential.totalCount).toBe(7);
    expect(state.categories.Essential.loadStatus).toBe(CookieTriageLoadStatus.Idle);
  });

  it('tracks countBusy separately from list loadStatus', () => {
    let state = createEmptySession(ConsentTriageType.Cookies);
    state = cookieTriageReducer(state, {
      type: 'countFetchStart',
      purpose: CookieTriagePurposeCategory.Advertising,
    });

    expect(state.categories.Advertising.countBusy).toBe(true);
    expect(state.categories.Advertising.loadStatus).toBe(CookieTriageLoadStatus.Idle);

    state = cookieTriageReducer(state, {
      type: 'setCategoryCount',
      purpose: CookieTriagePurposeCategory.Advertising,
      totalCount: 12,
    });

    expect(state.categories.Advertising.countBusy).toBe(false);
    expect(state.categories.Advertising.totalCount).toBe(12);
    expect(state.categories.Advertising.loadStatus).toBe(CookieTriageLoadStatus.Idle);
  });
});

describe('format helpers', () => {
  it('formats encounters and relative last activity', () => {
    expect(formatEncounters(1200)).toBe('1,200');
    expect(formatEncounters(31204)).toBe('31,204');
    expect(formatEncounters(undefined)).toBe('—');
    expect(formatEncounters(Number.NaN)).toBe('—');
    expect(decisionReadLabel(CookieTriageDecision.Approve)).toBe('Approved');
    expect(decisionReadLabel(CookieTriageDecision.Junk)).toBe('Junked');

    const now = Date.parse('2026-08-27T12:00:00.000Z');
    expect(formatLastActivity('2026-08-27T11:48:00.000Z', now)).toBe('12 minutes ago');
    expect(formatLastActivity(undefined, now)).toBe('—');
  });

  it('builds category summary lines from suggestions', () => {
    const state = seededSession();
    const summary = selectCategorySummary(state.categories.Analytics);

    expect(summary).toEqual({
      approveSuggestionCount: 1,
      junkSuggestionCount: 1,
      triagedCount: 0,
    });
    expect(formatCategorySummaryLine(summary)).toBe('1 to approve as-is · 1 suggested junk');
    expect(formatApplySuggestionsLabel(summary)).toBe('Apply suggestions · 1 approve · 1 junk');
  });

  it('excludes decided rows from suggestion counts and omits empty apply segments', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_stale',
      decision: CookieTriageDecision.Junk,
    });

    const summary = selectCategorySummary(state.categories.Analytics);
    expect(summary).toEqual({
      approveSuggestionCount: 1,
      junkSuggestionCount: 0,
      triagedCount: 1,
    });
    expect(formatCategorySummaryLine(summary)).toBe('1 to approve as-is · 1 decided');
    expect(formatApplySuggestionsLabel(summary)).toBe('Apply suggestions · 1 approve');
  });

  it('formats undo suggestions from still-decided applied names', () => {
    let state = seededSession();
    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_ga',
      decision: CookieTriageDecision.Approve,
    });
    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_stale',
      decision: CookieTriageDecision.Junk,
    });

    const undoable = selectUndoableAppliedNames(state.categories.Analytics, [
      '_ga',
      '_stale',
      'missing',
    ]);
    expect(undoable).toEqual(['_ga', '_stale']);
    expect(formatUndoSuggestionsLabel(undoable.length)).toBe('Undo suggestions · 2');

    state = cookieTriageReducer(state, {
      type: 'undo',
      purpose: CookieTriagePurposeCategory.Analytics,
      name: '_ga',
    });
    expect(selectUndoableAppliedNames(state.categories.Analytics, ['_ga', '_stale'])).toEqual([
      '_stale',
    ]);
    expect(formatUndoSuggestionsLabel(0)).toBeUndefined();
  });

  it('builds an ask-opinion prompt with row context', () => {
    const prompt = buildAskOpinionPrompt({
      triageType: ConsentTriageType.Cookies,
      item: {
        name: '_ga',
        id: 'cookie-1',
        service: 'Google Analytics',
        trackingPurposes: [CookieTriagePurposeCategory.Analytics],
        occurrences: 31204,
        lastActivityAt: '2026-08-26T17:22:08.000Z',
      },
    });

    expect(prompt).toContain('this cookie needing review');
    expect(prompt).toContain('Name: _ga');
    expect(prompt).toContain('Service: Google Analytics');
    expect(prompt).toContain('Assigned purposes: Analytics');
    expect(prompt).not.toContain('Purpose tab:');
    expect(prompt).toContain('Recommend one of: approve, junk, or review.');
  });
});
