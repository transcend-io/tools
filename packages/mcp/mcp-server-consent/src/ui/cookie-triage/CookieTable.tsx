import { memo } from 'react';

import type { ConsentTriageType } from '../../lib/cookieTriageTypes.ts';
import type { CookieTriagePurposeCategory } from '../../lib/resolvePrimaryCookiePurpose.ts';
import { CookieRow } from './CookieRow.tsx';
import type { CookieRowState } from './cookieTriageState.ts';

interface CookieTableProps {
  /** Whether rows are cookies or data flows */
  triageType: ConsentTriageType;
  /** Purpose tab currently shown */
  purpose: CookieTriagePurposeCategory;
  /** Rows for this purpose */
  cookies: CookieRowState[];
}

const HEADER_CELL = 'px-4 py-2.5 text-left text-sm font-semibold uppercase text-content-subtle';

/** Triage table for one purpose category. */
export const CookieTable = memo(function CookieTable({
  triageType,
  purpose,
  cookies,
}: CookieTableProps) {
  const itemLabel = triageType === 'cookies' ? 'Cookie' : 'Data flow';

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[44rem] border-collapse">
        <thead>
          <tr className="border-b border-line-subtle">
            <th scope="col" className={HEADER_CELL}>
              <span className="block">{itemLabel}</span>
              <span className="block font-normal">Service</span>
            </th>
            <th scope="col" className={HEADER_CELL}>
              <span className="block">Encounters</span>
              <span className="block font-normal">Last activity</span>
            </th>
            <th scope="col" className={HEADER_CELL}>
              Purpose
            </th>
            <th scope="col" className={HEADER_CELL}>
              Decision
            </th>
          </tr>
        </thead>
        <tbody>
          {cookies.map((row) => (
            <CookieRow key={row.name} purpose={purpose} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
});
