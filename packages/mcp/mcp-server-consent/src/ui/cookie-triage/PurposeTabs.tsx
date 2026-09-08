import { Tabs } from '@transcend-io/mcp-ui-common';
import { memo, useMemo } from 'react';

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

  const items = useMemo(
    () =>
      purposes.map((purpose) => ({
        id: purpose,
        label: COOKIE_TRIAGE_PURPOSE_LABELS[purpose],
        count: categories[purpose]?.totalCount ?? 0,
      })),
    [purposes, categories],
  );

  return (
    <Tabs
      items={items}
      selectedId={selectedPurpose}
      ariaLabel="Cookie purposes"
      idPrefix="cookie-triage-tab"
      onSelect={(id) => selectPurpose(id as CookieTriagePurposeCategory)}
    />
  );
});
