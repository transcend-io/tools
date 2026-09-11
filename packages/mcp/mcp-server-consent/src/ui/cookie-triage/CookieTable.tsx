import { memo, type ReactNode } from 'react';

import type { ConsentTriageType } from '../../lib/cookieTriageTypes.ts';
import type { CookieTriagePurposeCategory } from '../../lib/resolvePrimaryCookiePurpose.ts';
import { CookieRow } from './CookieRow.tsx';
import { triageCopy } from './cookieTriageCopy.ts';
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

const HEADER_CELL = 'px-4 py-2.5 text-left text-sm font-semibold uppercase text-on-card';

/** Triage table for one purpose category. */
export const CookieTable = memo(function CookieTable({
  triageType,
  purpose,
  cookies,
  footer,
}: CookieTableProps) {
  const { singularTitle } = triageCopy(triageType);

  return (
    <div className="min-h-0 min-w-0 w-full flex-1 overflow-y-auto overflow-x-hidden">
      {/* Fixed layout keeps columns inside the shell — no horizontal scroll on narrow hosts. */}
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[16%]" />
          <col className="w-[24%]" />
          <col className="w-[34%]" />
        </colgroup>
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-card-line bg-card">
            <th scope="col" className={HEADER_CELL}>
              <span className="block">{singularTitle}</span>
              <span className="block font-normal text-on-card-subtle">Service</span>
            </th>
            <th scope="col" className={HEADER_CELL}>
              <span className="block">Encounters</span>
              <span className="block font-normal text-on-card-subtle">Last activity</span>
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
            <CookieRow key={`${purpose}:${row.name}`} purpose={purpose} row={row} />
          ))}
        </tbody>
      </table>
      {footer ? <div className="px-4">{footer}</div> : null}
    </div>
  );
});
