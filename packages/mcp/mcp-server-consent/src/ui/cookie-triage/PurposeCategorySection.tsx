import { memo, useMemo } from 'react';

import {
  COOKIE_TRIAGE_PURPOSE_LABELS,
  type CookieTriagePurposeCategory,
} from '../../lib/resolvePrimaryCookiePurpose.ts';
import { CookieTable } from './CookieTable.tsx';
import { useCookieTriageActions, useCookieTriageCategory } from './CookieTriageContext.tsx';
import {
  formatApplySuggestionsLabel,
  formatCategorySummaryLine,
  selectAppliableCount,
  selectCategorySummary,
} from './cookieTriageState.ts';

interface PurposeCategorySectionProps {
  /** Active purpose tab */
  purpose: CookieTriagePurposeCategory;
}

/** Group header + cookie table for the selected purpose tab. */
export const PurposeCategorySection = memo(function PurposeCategorySection({
  purpose,
}: PurposeCategorySectionProps) {
  const category = useCookieTriageCategory(purpose);
  const { applySuggestions } = useCookieTriageActions();

  const summary = useMemo(
    () => (category ? selectCategorySummary(category) : undefined),
    [category],
  );

  if (!category || !summary) {
    return null;
  }

  const appliableCount = selectAppliableCount(summary);
  const label = COOKIE_TRIAGE_PURPOSE_LABELS[purpose];

  return (
    <section
      className="flex flex-col gap-4 pt-4"
      aria-labelledby={`cookie-triage-group-${purpose}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h2
              id={`cookie-triage-group-${purpose}`}
              className="text-heading-sm font-semibold text-content"
            >
              {label}
            </h2>
            <span className="text-sm text-content-muted">
              {category.totalCount.toLocaleString('en-US')} cookies
            </span>
          </div>
          <p className="text-sm text-content">{formatCategorySummaryLine(summary)}</p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-sm bg-brand px-2 py-1 text-sm text-content-inverse disabled:opacity-40"
          disabled={appliableCount === 0}
          onClick={() => applySuggestions(purpose)}
        >
          {formatApplySuggestionsLabel(summary)}
        </button>
      </div>
      <CookieTable purpose={purpose} cookies={category.cookies} />
    </section>
  );
});
