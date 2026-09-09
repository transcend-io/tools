import { StatChip } from '@transcend-io/mcp-ui-common';
import { memo } from 'react';

import { useCookieTriageSummary } from './CookieTriageContext.tsx';

/** Overview KPIs from API count calls plus session triage decisions. */
export const Overviews = memo(function Overviews() {
  const { triagedCount, dormantCount, pendingCount, summaryBusy } = useCookieTriageSummary();

  return (
    <div className="flex shrink justify-end gap-2 items-start">
      <StatChip label="Pending" value={pendingCount} busy={summaryBusy} />
      <StatChip
        label="Dormant"
        value={dormantCount}
        busy={summaryBusy}
        valueClassName="text-fill-dormant"
      />
      <StatChip label="Triaged" value={triagedCount} />
    </div>
  );
});
