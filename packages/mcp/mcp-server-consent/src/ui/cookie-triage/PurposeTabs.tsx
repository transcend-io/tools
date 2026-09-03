import { memo, type KeyboardEvent } from 'react';

import {
  COOKIE_TRIAGE_PURPOSE_LABELS,
  type CookieTriagePurposeCategory,
} from '../../lib/resolvePrimaryCookiePurpose.ts';
import {
  useCookieTriageActions,
  useCookieTriageCategories,
  useCookieTriagePurposes,
  useSelectedPurpose,
} from './CookieTriageContext.tsx';

/** Purpose category tabs with count badges and an active underline. */
export const PurposeTabs = memo(function PurposeTabs() {
  const purposes = useCookieTriagePurposes();
  const categories = useCookieTriageCategories();
  const selectedPurpose = useSelectedPurpose();
  const { selectPurpose } = useCookieTriageActions();

  function focusAndSelect(purpose: CookieTriagePurposeCategory): void {
    selectPurpose(purpose);
    document.getElementById(`cookie-triage-tab-${purpose}`)?.focus();
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    let nextIndex: number | undefined;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % purposes.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + purposes.length) % purposes.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = purposes.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextPurpose = purposes[nextIndex];
    if (nextPurpose !== undefined) {
      focusAndSelect(nextPurpose);
    }
  }

  return (
    <div className="border-b border-line-subtle">
      <div className="flex flex-wrap gap-x-6 gap-y-1" role="tablist" aria-label="Cookie purposes">
        {purposes.map((purpose, index) => {
          const isActive = purpose === selectedPurpose;
          const count = categories[purpose]?.totalCount ?? 0;
          const label = COOKIE_TRIAGE_PURPOSE_LABELS[purpose];

          return (
            <button
              key={purpose}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              id={`cookie-triage-tab-${purpose}`}
              className={
                isActive
                  ? 'relative -mb-px flex cursor-pointer items-center gap-2 border-b-2 border-brand bg-transparent pb-2 pt-1 text-sm font-medium text-brand-text'
                  : 'relative -mb-px flex cursor-pointer items-center gap-2 border-b-2 border-transparent bg-transparent pb-2 pt-1 text-sm font-medium text-content'
              }
              onClick={() => selectPurpose(purpose)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
            >
              <span>{label}</span>
              <span
                className={
                  isActive
                    ? 'inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-xs font-medium text-content-inverse'
                    : 'inline-flex min-w-5 items-center justify-center rounded-full bg-content-subtle px-1.5 py-0.5 text-xs font-medium text-content-inverse'
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
