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
    <div className="min-h-0 w-full flex-1 overflow-auto">
      {/* Preferred widths only — auto layout can still shrink when space is tight. */}
      <table className="w-full min-w-[44rem] border-collapse">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[10rem]" />
          <col className="w-[11rem]" />
          <col className="w-[18rem]" />
        </colgroup>
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-card-line bg-card">
            <th scope="col" className={HEADER_CELL}>
              <span className="block">{singularTitle}</span>
              <span className="block font-normal text-on-card-subtle">Service</span>
            </th>
            <th scope="col" className={`${HEADER_CELL} whitespace-nowrap`}>
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
            <CookieRow key={row.name} purpose={purpose} row={row} />
          ))}
        </tbody>
      </table>
      {footer ? <div className="px-4">{footer}</div> : null}
    </div>
  );
});
