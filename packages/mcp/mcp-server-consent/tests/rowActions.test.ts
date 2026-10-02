import { describe, expect, it } from 'vitest';

import { CookieTriageDecision } from '../src/lib/cookieTriageTypes.js';
import {
  CookieTriageRowAction,
  defaultRowAction,
  formatSuggestionLine,
  nextPrimaryAfterSuggestionChange,
  rowActionLabel,
  rowActionMenuItems,
  rowActionSet,
} from '../src/ui/cookie-triage/rowActions.js';

describe('defaultRowAction', () => {
  it('defaults to the suggestion when present', () => {
    expect(defaultRowAction(CookieTriageDecision.Junk)).toBe(CookieTriageRowAction.Junk);
    expect(defaultRowAction(CookieTriageDecision.Approve)).toBe(CookieTriageRowAction.Approve);
  });

  it('defaults to Approve when there is no suggestion', () => {
    expect(defaultRowAction(undefined)).toBe(CookieTriageRowAction.Approve);
  });
});

describe('nextPrimaryAfterSuggestionChange', () => {
  it('follows the new suggestion when primary still matches the previous default', () => {
    expect(
      nextPrimaryAfterSuggestionChange(
        CookieTriageRowAction.Junk,
        CookieTriageDecision.Junk,
        CookieTriageDecision.Approve,
      ),
    ).toBe(CookieTriageRowAction.Approve);
    expect(
      nextPrimaryAfterSuggestionChange(
        CookieTriageRowAction.Approve,
        CookieTriageDecision.Approve,
        CookieTriageDecision.Junk,
      ),
    ).toBe(CookieTriageRowAction.Junk);
  });

  it('keeps a user-selected primary that diverged from the previous default', () => {
    expect(
      nextPrimaryAfterSuggestionChange(
        CookieTriageRowAction.LeaveComment,
        CookieTriageDecision.Approve,
        CookieTriageDecision.Junk,
      ),
    ).toBe(CookieTriageRowAction.LeaveComment);
    expect(
      nextPrimaryAfterSuggestionChange(
        CookieTriageRowAction.Junk,
        CookieTriageDecision.Approve,
        CookieTriageDecision.Junk,
      ),
    ).toBe(CookieTriageRowAction.Junk);
  });
});

describe('rowActionSet / rowActionMenuItems', () => {
  it('includes Delete record when permanent delete is supported', () => {
    expect(rowActionSet(true)).toEqual([
      CookieTriageRowAction.Approve,
      CookieTriageRowAction.Junk,
      CookieTriageRowAction.DeleteRecord,
      CookieTriageRowAction.LeaveComment,
    ]);
  });

  it('omits Delete record when permanent delete is unsupported', () => {
    expect(rowActionSet(false)).toEqual([
      CookieTriageRowAction.Approve,
      CookieTriageRowAction.Junk,
      CookieTriageRowAction.LeaveComment,
    ]);
  });

  it('excludes the current primary from the menu', () => {
    expect(rowActionMenuItems(CookieTriageRowAction.Approve, true)).toEqual([
      CookieTriageRowAction.Junk,
      CookieTriageRowAction.DeleteRecord,
      CookieTriageRowAction.LeaveComment,
    ]);
    expect(rowActionMenuItems(CookieTriageRowAction.Junk, false)).toEqual([
      CookieTriageRowAction.Approve,
      CookieTriageRowAction.LeaveComment,
    ]);
  });
});

describe('rowActionLabel / formatSuggestionLine', () => {
  it('labels each row action', () => {
    expect(rowActionLabel(CookieTriageRowAction.Approve)).toBe('Approve');
    expect(rowActionLabel(CookieTriageRowAction.Junk)).toBe('Junk');
    expect(rowActionLabel(CookieTriageRowAction.DeleteRecord)).toBe('Delete record');
    expect(rowActionLabel(CookieTriageRowAction.LeaveComment)).toBe('Leave comment');
  });

  it('formats suggestion lines for approve, junk, and none', () => {
    expect(formatSuggestionLine(CookieTriageDecision.Approve)).toBe('Suggested: approve');
    expect(formatSuggestionLine(CookieTriageDecision.Junk)).toBe('Suggested: junk');
    expect(formatSuggestionLine(undefined)).toBe('No suggestion');
  });
});
