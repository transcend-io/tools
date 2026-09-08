import {
  Button,
  ButtonVariant,
  InlineAlert,
  Spinner,
  SpinnerVariant,
} from '@transcend-io/mcp-ui-common';
import { memo, useMemo } from 'react';

import {
  COOKIE_TRIAGE_PURPOSE_LABELS,
  type CookieTriagePurposeCategory,
} from '../../lib/resolvePrimaryCookiePurpose.ts';
import { CookieTable } from './CookieTable.tsx';
import {
  useCookieTriageActions,
  useCookieTriageCategory,
  useCookieTriageState,
} from './CookieTriageContext.tsx';
import { formatCategorySummaryLine, selectCategorySummary } from './cookieTriageState.ts';

interface PurposeCategorySectionProps {
  /** Active purpose tab */
  purpose: CookieTriagePurposeCategory;
}

/** Group header + table for the selected purpose tab. */
export const PurposeCategorySection = memo(function PurposeCategorySection({
  purpose,
}: PurposeCategorySectionProps) {
  const { triageType } = useCookieTriageState();
  const category = useCookieTriageCategory(purpose);
  const { loadMore } = useCookieTriageActions();

  const summary = useMemo(() => selectCategorySummary(category), [category]);

  const label = COOKIE_TRIAGE_PURPOSE_LABELS[purpose];
  const itemNoun = triageType === 'cookies' ? 'cookies' : 'data flows';
  const isLoading = category.loadStatus === 'loading';
  const isInitialLoading = isLoading && category.cookies.length === 0;
  const isLoadingMore = isLoading && category.cookies.length > 0;

  return (
    <section
      className="flex min-h-0 flex-1 flex-col gap-4 pt-4"
      aria-labelledby={`cookie-triage-group-${purpose}`}
    >
      <div className="flex min-w-0 shrink-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <h2
            id={`cookie-triage-group-${purpose}`}
            className="text-heading-sm font-semibold text-content"
          >
            {label}
          </h2>
          <span className="text-sm text-content-muted">
            {category.totalCount.toLocaleString('en-US')} {itemNoun}
          </span>
        </div>
        <p className="text-sm text-content">{formatCategorySummaryLine(summary)}</p>
      </div>
      {isInitialLoading ? (
        <div className="shrink-0" aria-busy="true">
          <Spinner label={`Loading ${itemNoun}…`} />
        </div>
      ) : null}
      {category.loadError ? (
        <InlineAlert
          title={`Failed to load ${itemNoun}`}
          message={category.loadError}
          action={
            <Button variant={ButtonVariant.Primary} onClick={() => loadMore(purpose)}>
              Retry
            </Button>
          }
        />
      ) : null}
      {category.cookies.length > 0 ? (
        <CookieTable
          triageType={triageType}
          purpose={purpose}
          cookies={category.cookies}
          footer={
            category.hasNextPage && (category.loadStatus === 'ready' || isLoadingMore) ? (
              <Button
                variant={ButtonVariant.Primary}
                busy={isLoadingMore}
                busyLabel="Loading more"
                onClick={() => loadMore(purpose)}
              >
                Load more
              </Button>
            ) : null
          }
        />
      ) : null}
    </section>
  );
});
