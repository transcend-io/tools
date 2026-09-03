import type { ConsentTriageType } from './cookieTriageTypes.js';
import type { CookieTriagePurposeCategory } from './resolvePrimaryCookiePurpose.js';

/** Page size the triage view requests from list tools */
export const COOKIE_TRIAGE_UI_PAGE_SIZE = 20;

/** Extra list pages to pull when a page claims zero rows for the active tab */
export const COOKIE_TRIAGE_AUTOFILL_PAGES = 5;

/**
 * Arguments for `consent_list_cookies` or `consent_list_data_flows` for one purpose tab.
 *
 * `NoPurpose` omits the purpose filter so the view can keep unassigned rows.
 */
export function buildTriageListArgs(
  triageType: ConsentTriageType,
  purpose: CookieTriagePurposeCategory,
  offset: number,
): Record<string, unknown> {
  const purposeFilter =
    purpose === 'NoPurpose'
      ? {}
      : triageType === 'cookies'
        ? { trackingPurposes: [purpose] }
        : { trackingTypes: [purpose] };

  return {
    status: 'NEEDS_REVIEW',
    first: COOKIE_TRIAGE_UI_PAGE_SIZE,
    offset,
    orderField: 'occurrences',
    orderDirection: 'DESC',
    ...purposeFilter,
  };
}
