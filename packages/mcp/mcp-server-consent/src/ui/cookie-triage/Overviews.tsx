import { memo } from 'react';

import { useCookieTriageSummary } from './CookieTriageContext.tsx';
import { OverviewItem } from './OverviewItem.tsx';

/** Overview KPIs from API count calls plus session triage decisions. */
export const Overviews = memo(function Overviews() {
  const { triagedCount, dormantCount, pendingCount } = useCookieTriageSummary();

  return (
    <div className="flex shrink justify-end gap-2 items-start">
      <OverviewItem label="Pending" value={pendingCount} />
      <OverviewItem label="Dormant" value={dormantCount} />
      <OverviewItem label="Triaged" value={triagedCount} />
    </div>
  );
});
