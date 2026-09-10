import type { App } from '@modelcontextprotocol/ext-apps';
import {
  A,
  Button,
  ButtonVariant,
  ChevronDownIcon,
  InlineAlert,
  Spinner,
  TableListFooter,
} from '@transcend-io/mcp-ui-common';
import { memo, useMemo, useState } from 'react';

import { COOKIE_TRIAGE_UI_PAGE_SIZE } from '../../lib/cookieTriageConfig.ts';
import {
  getPurposeLabel,
  type CookieTriagePurposeCategory,
} from '../../lib/resolvePrimaryCookiePurpose.ts';
import { CookieTable } from './CookieTable.tsx';
import {
  useAppliedSuggestionNames,
  useCookieTriageActions,
  useCookieTriageActiveCategory,
  useCookieTriageMeta,
} from './CookieTriageContext.tsx';
import { triageCopy } from './cookieTriageCopy.ts';
import {
  CookieTriageLoadStatus,
  formatApplySuggestionsLabel,
  formatUndoSuggestionsLabel,
  selectCategorySummary,
  selectUndoableAppliedNames,
} from './cookieTriageState.ts';

interface PurposeCategorySectionProps {
  /** Connected MCP App instance used to open dashboard deep links */
  app: App | null;
  /** Active purpose tab */
  purpose: CookieTriagePurposeCategory;
}

/** Group header + table for the selected purpose tab. */
export const PurposeCategorySection = memo(function PurposeCategorySection({
  app,
  purpose,
}: PurposeCategorySectionProps) {
  const { triageType } = useCookieTriageMeta();
  const category = useCookieTriageActiveCategory();
  const appliedSuggestionNames = useAppliedSuggestionNames(purpose);
  const { loadMore, applySuggestions, undoSuggestions } = useCookieTriageActions();
  const [busyMode, setBusyMode] = useState<'apply' | 'undo' | undefined>();
  const [actionError, setActionError] = useState<{ title: string; message: string } | undefined>();
  const { plural, dashboardUrl } = triageCopy(triageType);

  const applyLabel = useMemo(
    () => formatApplySuggestionsLabel(selectCategorySummary(category)),
    [category],
  );
  const undoableNames = useMemo(
    () => selectUndoableAppliedNames(category, appliedSuggestionNames),
    [category, appliedSuggestionNames],
  );
  const undoLabel = useMemo(
    () => formatUndoSuggestionsLabel(undoableNames.length),
    [undoableNames.length],
  );
  const headerAction =
    busyMode === 'apply'
      ? { mode: 'apply' as const, label: applyLabel ?? 'Apply suggestions' }
      : busyMode === 'undo'
        ? { mode: 'undo' as const, label: undoLabel ?? 'Undo suggestions' }
        : undoLabel !== undefined
          ? { mode: 'undo' as const, label: undoLabel }
          : applyLabel !== undefined
            ? { mode: 'apply' as const, label: applyLabel }
            : undefined;

  const label = getPurposeLabel(purpose);
  const isLoading = category.loadStatus === CookieTriageLoadStatus.Loading;
  const isInitialLoading = isLoading && category.cookies.length === 0;
  const isLoadingMore = isLoading && category.cookies.length > 0;
  const busy = busyMode !== undefined;
  const shownCount = category.cookies.length;
  const nextCount = Math.min(
    COOKIE_TRIAGE_UI_PAGE_SIZE,
    Math.max(0, category.totalCount - shownCount),
  );

  async function onApplySuggestions(): Promise<void> {
    setBusyMode('apply');
    setActionError(undefined);
    try {
      await applySuggestions(purpose);
    } catch (error) {
      setActionError({
        title: 'Failed to apply suggestions',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusyMode(undefined);
    }
  }

  async function onUndoSuggestions(): Promise<void> {
    setBusyMode('undo');
    setActionError(undefined);
    try {
      await undoSuggestions(purpose);
    } catch (error) {
      setActionError({
        title: 'Failed to undo suggestions',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusyMode(undefined);
    }
  }

  return (
    <section
      className="flex min-h-0 flex-1 flex-col gap-4 pt-4"
      aria-labelledby={`cookie-triage-group-${purpose}`}
    >
      <div className="flex min-w-0 shrink-0 justify-between gap-4 items-center">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h2
              id={`cookie-triage-group-${purpose}`}
              className="text-heading-sm font-semibold text-on-card"
            >
              {label}
            </h2>
            <span className="text-sm text-on-card-subtle">
              {category.totalCount.toLocaleString('en-US')} {plural}
            </span>
          </div>
        </div>
        <Button
          variant={ButtonVariant.Primary}
          className="shrink-0"
          busy={busy}
          busyLabel={busyMode === 'undo' ? 'Undoing suggestions' : 'Applying suggestions'}
          disabled={busy || !headerAction}
          onClick={() => {
            if (headerAction?.mode === 'undo') {
              void onUndoSuggestions();
            } else {
              void onApplySuggestions();
            }
          }}
        >
          {headerAction?.label ?? 'Apply suggestions'}
        </Button>
      </div>
      {actionError ? <InlineAlert title={actionError.title} message={actionError.message} /> : null}
      {isInitialLoading ? (
        <div className="shrink-0" aria-busy="true">
          <Spinner label={`Loading ${plural}…`} />
        </div>
      ) : null}
      {category.loadError ? (
        <InlineAlert
          title={`Failed to load ${plural}`}
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
            category.loadStatus === CookieTriageLoadStatus.Ready || isLoadingMore ? (
              category.hasNextPage ? (
                <TableListFooter
                  status="more"
                  shownCount={shownCount}
                  totalCount={category.totalCount}
                  action={
                    <Button
                      variant={ButtonVariant.Text}
                      className="text-md font-medium text-on-card"
                      disabled={isLoadingMore || nextCount === 0}
                      busy={isLoadingMore}
                      busyLabel="Loading more"
                      onClick={() => loadMore(purpose)}
                    >
                      Show next {nextCount.toLocaleString('en-US')} rows
                      <ChevronDownIcon width={16} height={16} className="shrink-0" />
                    </Button>
                  }
                >
                  Prefer the full list?{' '}
                  <A app={app} href={dashboardUrl} label="Open in admin dashboard ↗" />
                </TableListFooter>
              ) : (
                <TableListFooter
                  status="done"
                  shownCount={shownCount}
                  totalCount={category.totalCount}
                  message={`No more ${plural} to triage under this purpose.`}
                >
                  Double check in the <A app={app} href={dashboardUrl} label="admin dashboard ↗" />
                </TableListFooter>
              )
            ) : null
          }
        />
      ) : null}
    </section>
  );
});
