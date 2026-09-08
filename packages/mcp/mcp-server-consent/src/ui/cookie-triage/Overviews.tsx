import { StatChip } from '@transcend-io/mcp-ui-common';
import { memo } from 'react';

import { useCookieTriageSummary } from './CookieTriageContext.tsx';

/** Overview KPIs from API count calls plus session triage decisions. */
export const Overviews = memo(function Overviews() {
  const { triagedCount, dormantCount, pendingCount } = useCookieTriageSummary();

  return (
    <div className="flex shrink justify-end gap-2 items-start">
      <StatChip label="Pending" value={pendingCount} />
      <StatChip label="Dormant" value={dormantCount} />
      <StatChip label="Triaged" value={triagedCount} />
    </div>
  );
});
