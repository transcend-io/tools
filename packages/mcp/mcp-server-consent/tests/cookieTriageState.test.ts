import { describe, expect, it } from 'vitest';

import type { CookieTriageAnalysis } from '../src/lib/cookieTriageTypes.js';
import {
  canUndoRow,
  cookieTriageReducer,
  createEmptySession,
  decisionReadLabel,
  formatCategorySummaryLine,
  formatEncounters,
  formatLastActivity,
  isDormantCookie,
  selectCategorySummary,
  selectPurposes,
  selectSummary,
  type CookieTriageSessionState,
} from '../src/ui/cookie-triage/cookieTriageState.js';

const analyticsCookies: CookieTriageAnalysis[] = [
  {
    name: '_ga',
    trackingPurposes: ['Analytics'],
    lastActivityAt: '2026-08-26T17:22:08.000Z',
  },
  {
    name: '_stale',
    trackingPurposes: ['Analytics'],
    lastActivityAt: '2025-01-01T00:00:00.000Z',
  },
];

function seedPurpose(
  state: CookieTriageSessionState,
  purpose: 'Analytics' | 'NoPurpose' | 'Essential' | 'Advertising',
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
  state = seedPurpose(state, 'NoPurpose', [{ name: '_unknown' }]);
  return state;
}

describe('createEmptySession', () => {
  it('seeds every purpose tab idle with Essential selected', () => {
    const state = createEmptySession('cookies');

    expect(state.triageType).toBe('cookies');
    expect(state.selectedPurpose).toBe('Essential');
    expect(selectPurposes()).toEqual([
      'Essential',
      'Functional',
      'Advertising',
      'Analytics',
      'SaleOfInfo',
      'NoPurpose',
    ]);
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
      trackingPurposes: ['Analytics'],
    };
    const state = seedPurpose(createEmptySession('cookies'), 'Analytics', [item], 2);

    expect(state.categories.Analytics.cookies).toEqual([{ name: '_ga', initial: item }]);
    expect(state.categories.Analytics.cookies[0]?.initial).not.toBe(item);
    expect(state.categories.Analytics.totalCount).toBe(2);
    expect(state.categories.Analytics.nextOffset).toBe(1);
    expect(state.categories.Analytics.loadStatus).toBe('ready');
    expect(state.categories.Analytics.cookies[0]?.decision).toBeUndefined();
  });

  it('keeps only rows whose primary purpose matches the tab', () => {
    const state = seedPurpose(createEmptySession('cookies'), 'Advertising', [
      { name: 'ads', trackingPurposes: ['Advertising'] },
      { name: 'also-essential', trackingPurposes: ['Essential', 'Advertising'] },
    ]);

    expect(state.categories.Advertising.cookies.map((row) => row.name)).toEqual(['ads']);
  });

  it('skips rows already present in the session', () => {
    let state = seedPurpose(createEmptySession('cookies'), 'Analytics', [
      { name: '_ga', id: 'c1', trackingPurposes: ['Analytics'] },
    ]);
    state = seedPurpose(state, 'Analytics', [
      { name: '_ga', id: 'c1', trackingPurposes: ['Analytics'] },
      { name: '_gid', trackingPurposes: ['Analytics'] },
    ]);

    expect(state.categories.Analytics.cookies.map((row) => row.name)).toEqual(['_ga', '_gid']);
  });

  it('uses loaded count as totalCount for Other', () => {
    const state = cookieTriageReducer(createEmptySession('cookies'), {
      type: 'appendPage',
      purpose: 'NoPurpose',
      items: [{ name: '_unknown' }, { name: '_ga', trackingPurposes: ['Analytics'] }],
      fetchedCount: 20,
      totalCount: 400,
      hasNextPage: true,
    });

    expect(state.categories.NoPurpose.cookies).toHaveLength(1);
    expect(state.categories.NoPurpose.totalCount).toBe(1);
    expect(state.categories.NoPurpose.nextOffset).toBe(20);
    expect(state.categories.NoPurpose.hasNextPage).toBe(true);
  });
});

describe('selectSummary', () => {
  it('counts pending, dormant, and triaged rows across categories', () => {
    expect(selectSummary(seededSession().categories)).toEqual({
      pendingCount: 3,
      dormantCount: 1,
      triagedCount: 0,
    });
  });
});

describe('isDormantCookie', () => {
  it('returns true when last activity is older than 30 days', () => {
    expect(
      isDormantCookie({
        name: 'x',
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
    expect(selectSummary(state.categories)).toEqual({
      pendingCount: 2,
      dormantCount: 1,
      triagedCount: 1,
    });
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
    const unchanged = state.categories.NoPurpose.cookies[0];

    const next = cookieTriageReducer(state, {
      type: 'decide',
      purpose: 'Analytics',
      name: '_ga',
      decision: 'approve',
    });

    expect(next.categories.NoPurpose.cookies[0]).toBe(unchanged);
    expect(next.categories.Analytics.cookies.find((row) => row.name === '_ga')).not.toBe(
      state.categories.Analytics.cookies.find((row) => row.name === '_ga'),
    );
    expect(next.categories.Analytics).not.toBe(state.categories.Analytics);
    expect(next.selectedPurpose).toBe(state.selectedPurpose);
  });

  it('updates the selected purpose tab', () => {
    let state = createEmptySession('cookies');
    expect(state.selectedPurpose).toBe('Essential');

    state = cookieTriageReducer(state, { type: 'selectPurpose', purpose: 'NoPurpose' });
    expect(state.selectedPurpose).toBe('NoPurpose');
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
});

describe('format helpers', () => {
  it('formats encounters and relative last activity', () => {
    expect(formatEncounters(31204)).toBe('31,204');
    expect(formatEncounters(undefined)).toBe('—');
    expect(decisionReadLabel('approve')).toBe('Approve');

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
});
