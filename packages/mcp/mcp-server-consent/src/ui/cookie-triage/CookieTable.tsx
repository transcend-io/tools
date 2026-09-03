import { memo, type ReactNode } from 'react';

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
  /** Optional footer rendered inside the scroll container (e.g. Load more) */
  footer?: ReactNode;
}

const HEADER_CELL = 'px-4 py-2.5 text-left text-sm font-semibold uppercase text-content-subtle';

/** Triage table for one purpose category. */
export const CookieTable = memo(function CookieTable({
  triageType,
  purpose,
  cookies,
  footer,
}: CookieTableProps) {
  const itemLabel = triageType === 'cookies' ? 'Cookie' : 'Data flow';

  return (
    <div className="min-h-0 w-full flex-1 overflow-auto">
      <table className="w-full min-w-[44rem] border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-line-subtle bg-surface">
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
      {footer ? <div className="px-4 py-3">{footer}</div> : null}
    </div>
  );
});
