import { Tabs } from '@transcend-io/mcp-ui-common';
import { memo, useMemo } from 'react';

import {
  COOKIE_TRIAGE_PURPOSE_LABELS,
  type CookieTriagePurposeCategory,
} from '../../lib/resolvePrimaryCookiePurpose.ts';
import { useCookieTriageActions, useCookieTriageChrome } from './CookieTriageContext.tsx';

/** Purpose category tabs with count badges and an active underline. */
export const PurposeTabs = memo(function PurposeTabs() {
  const { purposes, selectedPurpose, tabs } = useCookieTriageChrome();
  const { selectPurpose } = useCookieTriageActions();

  const items = useMemo(
    () =>
      purposes.map((purpose) => {
        const tab = tabs.find((candidate) => candidate.id === purpose);
        return {
          id: purpose,
          label: COOKIE_TRIAGE_PURPOSE_LABELS[purpose],
          count: tab?.totalCount ?? 0,
          countBusy: tab?.countBusy === true,
        };
      }),
    [purposes, tabs],
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
