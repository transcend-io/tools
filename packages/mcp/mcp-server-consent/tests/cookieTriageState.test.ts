import { describe, expect, it } from 'vitest';

import type { CookieTriageAppPayload } from '../src/lib/cookieTriageTypes.js';
import {
  canUndoRow,
  cookieTriageReducer,
  createInitialState,
  formatApplySuggestionsLabel,
  formatCategorySummaryLine,
  formatEncounters,
  formatLastActivity,
  isDormantCookie,
  selectAppliableCount,
  selectCategorySummary,
  selectPurposes,
  selectSummary,
  suggestionReadLabel,
} from '../src/ui/cookie-triage/cookieTriageState.js';

const payload: CookieTriageAppPayload = {
  organizationName: 'Acme Corp',
  categories: [
    {
      purpose: 'Analytics',
      totalCount: 2,
      shownCount: 2,
      cookies: [
        {
          name: '_ga',
          suggestion: 'approve',
          reason: 'Google Analytics.',
          lastActivityAt: '2026-08-26T17:22:08.000Z',
        },
        {
          name: '_stale',
          suggestion: 'review',
          reason: 'Unknown tracker.',
          lastActivityAt: '2025-01-01T00:00:00.000Z',
        },
      ],
    },
    {
      purpose: 'NoPurpose',
      totalCount: 1,
      shownCount: 1,
      cookies: [{ name: '_unknown', suggestion: 'review', reason: 'Needs review.' }],
    },
  ],
};

describe('createInitialState', () => {
  it('clones purpose-keyed categories without retaining the payload', () => {
    const state = createInitialState(payload);

    expect(state.organizationName).toBe('Acme Corp');
    expect(selectPurposes(state.categories)).toEqual(['Analytics', 'NoPurpose']);
    expect(
      selectPurposes({
        NoPurpose: state.categories.NoPurpose,
        Analytics: state.categories.Analytics,
      }),
    ).toEqual(['Analytics', 'NoPurpose']);
    expect(state.categories.Analytics).toEqual({
      totalCount: 2,
      cookies: [
        { name: '_ga', initial: payload.categories[0]!.cookies[0] },
        { name: '_stale', initial: payload.categories[0]!.cookies[1] },
      ],
    });
    expect(state.categories.Analytics!.cookies[0]!.initial).not.toBe(
      payload.categories[0]!.cookies[0],
    );
    expect(state.categories.Analytics!.cookies.every((row) => row.decision === undefined)).toBe(
      true,
    );
    expect(state.selectedPurpose).toBe('Analytics');
  });

  it('sorts cookies by occurrences descending within each purpose', () => {
    const state = createInitialState({
      organizationName: 'Acme Corp',
      categories: [
        {
          purpose: 'Analytics',
          totalCount: 3,
          shownCount: 3,
          cookies: [
            { name: 'low', suggestion: 'review', reason: 'Low traffic.', occurrences: 2 },
            { name: 'high', suggestion: 'approve', reason: 'High traffic.', occurrences: 100 },
            { name: 'mid', suggestion: 'junk', reason: 'Mid traffic.', occurrences: 50 },
          ],
        },
      ],
    });

    expect(state.categories.Analytics!.cookies.map((row) => row.name)).toEqual([
      'high',
      'mid',
      'low',
    ]);
  });
});

describe('selectSummary', () => {
  it('counts pending, dormant, and triaged rows across categories', () => {
    const state = createInitialState(payload);

    expect(selectSummary(state.categories)).toEqual({
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
        suggestion: 'review',
        reason: 'r',
        lastActivityAt: '2025-01-01T00:00:00.000Z',
      }),
    ).toBe(true);
  });
});

describe('cookieTriageReducer', () => {
  it('records a decision for one row within its purpose category', () => {
    let state = createInitialState(payload);

    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: 'Analytics',
      name: '_ga',
      decision: 'approve',
    });

    expect(state.categories.Analytics!.cookies.find((row) => row.name === '_ga')?.decision).toBe(
      'approve',
    );
    expect(selectSummary(state.categories)).toEqual({
      pendingCount: 2,
      dormantCount: 1,
      triagedCount: 1,
    });
  });

  it('reverts a row to its initial pending state on undo', () => {
    let state = createInitialState(payload);
    state = cookieTriageReducer(state, {
      type: 'decide',
      purpose: 'Analytics',
      name: '_ga',
      decision: 'approve',
    });

    const row = state.categories.Analytics!.cookies.find((candidate) => candidate.name === '_ga')!;
    expect(canUndoRow(row)).toBe(true);

    state = cookieTriageReducer(state, { type: 'undo', purpose: 'Analytics', name: '_ga' });

    expect(
      state.categories.Analytics!.cookies.find((candidate) => candidate.name === '_ga')?.decision,
    ).toBeUndefined();
    expect(
      canUndoRow(
        state.categories.Analytics!.cookies.find((candidate) => candidate.name === '_ga')!,
      ),
    ).toBe(false);
  });

  it('reuses unchanged category cookie objects when updating one row', () => {
    const state = createInitialState(payload);
    const unchanged = state.categories.NoPurpose!.cookies[0];

    const next = cookieTriageReducer(state, {
      type: 'decide',
      purpose: 'Analytics',
      name: '_ga',
      decision: 'approve',
    });

    expect(next.categories.NoPurpose!.cookies[0]).toBe(unchanged);
    expect(next.categories.Analytics!.cookies.find((row) => row.name === '_ga')).not.toBe(
      state.categories.Analytics!.cookies.find((row) => row.name === '_ga'),
    );
    expect(next.categories.Analytics).not.toBe(state.categories.Analytics);
    expect(next.selectedPurpose).toBe(state.selectedPurpose);
  });

  it('updates the selected purpose tab', () => {
    let state = createInitialState(payload);
    expect(state.selectedPurpose).toBe('Analytics');

    state = cookieTriageReducer(state, { type: 'selectPurpose', purpose: 'NoPurpose' });
    expect(state.selectedPurpose).toBe('NoPurpose');
  });

  it('ignores selecting an unknown or already-selected purpose', () => {
    const state = createInitialState(payload);

    expect(cookieTriageReducer(state, { type: 'selectPurpose', purpose: 'Essential' })).toBe(state);
    expect(cookieTriageReducer(state, { type: 'selectPurpose', purpose: 'Analytics' })).toBe(state);
  });

  it('applies pending approve and junk suggestions while skipping review', () => {
    let state = createInitialState(payload);

    state = cookieTriageReducer(state, { type: 'applySuggestions', purpose: 'Analytics' });

    expect(state.categories.Analytics!.cookies.find((row) => row.name === '_ga')?.decision).toBe(
      'approve',
    );
    expect(state.categories.Analytics!.cookies.find((row) => row.name === '_stale')?.decision).toBe(
      undefined,
    );
  });
});

describe('format helpers', () => {
  it('formats encounters and relative last activity', () => {
    expect(formatEncounters(31204)).toBe('31,204');
    expect(formatEncounters(undefined)).toBe('—');
    expect(suggestionReadLabel('approve')).toBe('Approve');

    const now = Date.parse('2026-08-27T12:00:00.000Z');
    expect(formatLastActivity('2026-08-27T11:48:00.000Z', now)).toBe('12 minutes ago');
    expect(formatLastActivity(undefined, now)).toBe('—');
  });

  it('builds category summary and apply labels', () => {
    const state = createInitialState(payload);
    const summary = selectCategorySummary(state.categories.Analytics!);

    expect(summary).toEqual({
      approveCount: 1,
      junkCount: 0,
      dormantCount: 1,
      pendingApproveCount: 1,
      pendingJunkCount: 0,
    });
    expect(selectAppliableCount(summary)).toBe(1);
    expect(formatCategorySummaryLine(summary)).toBe('1 to approve as-is · 1 dormant, worth a look');
    expect(formatApplySuggestionsLabel(summary)).toBe('Apply suggestions · 1 approve');
  });
});
