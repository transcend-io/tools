import { memo } from 'react';

import {
  COOKIE_TRIAGE_PURPOSE_LABELS,
  type CookieTriagePurposeCategory,
} from '../../lib/resolvePrimaryCookiePurpose.ts';
import { useCookieTriageActions } from './CookieTriageContext.tsx';
import {
  formatEncounters,
  formatLastActivity,
  isDormantCookie,
  type CookieRowState,
  type CookieTriageDecision,
} from './cookieTriageState.ts';
import { CheckIcon, ChevronDownIcon, CloseIcon, CommentIcon, TrashIcon } from './icons.tsx';
import { PURPOSE_BADGE_BG } from './purposeBadgeClasses.ts';

interface CookieRowProps {
  /** Purpose tab this row belongs to */
  purpose: CookieTriagePurposeCategory;
  /** Live row state */
  row: CookieRowState;
}

const DECISION_BUTTON =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-sm border bg-surface text-content-muted';
const DECISION_IDLE = `${DECISION_BUTTON} border-line`;
const DECISION_ACTIVE = `${DECISION_BUTTON} border-brand-text text-brand-text`;

/** One cookie/data-flow triage table row. */
export const CookieRow = memo(function CookieRow({ purpose, row }: CookieRowProps) {
  const { decide, undo } = useCookieTriageActions();
  const cookie = row.initial;
  const dormant = isDormantCookie(cookie);
  const activeDecision: CookieTriageDecision | undefined = row.decision;
  const purposeLabel = COOKIE_TRIAGE_PURPOSE_LABELS[purpose];

  function onDecision(next: CookieTriageDecision): void {
    if (row.decision === next) {
      undo(purpose, row.name);
      return;
    }
    decide(purpose, row.name, next);
  }

  return (
    <tr className="border-b border-line-subtle align-middle">
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-content break-all">{cookie.name}</span>
          <span className="text-sm text-content-muted">{cookie.service ?? 'Unknown'}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-content">{formatEncounters(cookie.occurrences)}</span>
          <span className="text-sm text-content-muted">
            {formatLastActivity(cookie.lastActivityAt)}
          </span>
          {dormant ? (
            <span className="mt-0.5 inline-flex w-fit items-center rounded-sm bg-fill-dormant px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wide text-content-inverse">
              DORMANT
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3">
        <div
          className="flex min-w-0 items-center gap-2 rounded-sm border border-line bg-surface px-1.5 py-1.5"
          aria-label={`Purpose: ${purposeLabel}`}
        >
          <span
            className={`inline-flex h-6 shrink-0 items-center rounded-sm px-1.5 text-sm text-content-inverse ${PURPOSE_BADGE_BG[purpose]}`}
          >
            {purposeLabel}
          </span>
          <span className="ml-auto text-content-muted">
            <ChevronDownIcon />
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5" role="group" aria-label="Decision">
          <button
            type="button"
            className={activeDecision === 'approve' ? DECISION_ACTIVE : DECISION_IDLE}
            aria-pressed={row.decision === 'approve'}
            aria-label="Approve"
            onClick={() => onDecision('approve')}
          >
            <CheckIcon />
          </button>
          <button
            type="button"
            className={activeDecision === 'review' ? DECISION_ACTIVE : DECISION_IDLE}
            aria-pressed={row.decision === 'review'}
            aria-label="Mark for review"
            onClick={() => onDecision('review')}
          >
            <CloseIcon />
          </button>
          <button
            type="button"
            className={activeDecision === 'junk' ? DECISION_ACTIVE : DECISION_IDLE}
            aria-pressed={row.decision === 'junk'}
            aria-label="Junk"
            onClick={() => onDecision('junk')}
          >
            <TrashIcon />
          </button>
          <button
            type="button"
            className={DECISION_IDLE}
            aria-label="Add note"
            disabled
            title="Notes are not available yet"
          >
            <CommentIcon />
          </button>
        </div>
      </td>
    </tr>
  );
});
