import { memo } from 'react';

import type { CookieTriagePurposeCategory } from '../../lib/resolvePrimaryCookiePurpose.ts';
import { CookieRow } from './CookieRow.tsx';
import type { CookieRowState } from './cookieTriageState.ts';

interface CookieTableProps {
  /** Purpose tab currently shown */
  purpose: CookieTriagePurposeCategory;
  /** Cookie rows for this purpose */
  cookies: CookieRowState[];
}

const HEADER_CELL = 'px-4 py-2.5 text-left text-sm font-semibold uppercase text-content-subtle';

/** Cookie triage table for one purpose category. */
export const CookieTable = memo(function CookieTable({ purpose, cookies }: CookieTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[52rem] border-collapse">
        <thead>
          <tr className="border-b border-line-subtle">
            <th scope="col" className={HEADER_CELL}>
              <span className="block">Cookie</span>
              <span className="block font-normal">Service</span>
            </th>
            <th scope="col" className={HEADER_CELL}>
              <span className="block">Encounters</span>
              <span className="block font-normal">Last activity</span>
            </th>
            <th scope="col" className={HEADER_CELL}>
              My read
            </th>
            <th scope="col" className={HEADER_CELL}>
              Suggested purpose
            </th>
            <th scope="col" className={HEADER_CELL}>
              Suggested decision
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
