import {
  ConsentTriageType,
  type ConsentTriageType as ConsentTriageTypeValue,
} from '../../lib/cookieTriageTypes.ts';

/** Default admin dashboard base URL when the host does not supply one. */
const DEFAULT_DASHBOARD_BASE_URL = 'https://app.transcend.io';

/** User-facing copy for cookies vs data-flow triage. */
export interface CookieTriageCopy {
  /** Singular noun (`cookie` / `data flow`) */
  singular: string;
  /** Plural noun (`cookies` / `data flows`) */
  plural: string;
  /** Title-case singular (`Cookie` / `Data flow`) */
  singularTitle: string;
  /** Title-case plural (`Cookies` / `Data flows`) */
  pluralTitle: string;
  /** Admin dashboard deep link for this triage type */
  dashboardUrl: string;
}

const COOKIE_COPY = {
  singular: 'cookie',
  plural: 'cookies',
  singularTitle: 'Cookie',
  pluralTitle: 'Cookies',
} as const;

const DATA_FLOW_COPY = {
  singular: 'data flow',
  plural: 'data flows',
  singularTitle: 'Data flow',
  pluralTitle: 'Data flows',
} as const;

const DASHBOARD_PATH = {
  [ConsentTriageType.Cookies]: '/consent-manager/cookies',
  [ConsentTriageType.DataFlows]: '/consent-manager/data-flows',
} as const;

/**
 * Nouns and dashboard URL for the active triage type.
 *
 * @param triageType - Cookies vs data flows
 * @param dashboardBaseUrl - Admin dashboard origin (from `TRANSCEND_DASHBOARD_URL` when set)
 */
export function triageCopy(
  triageType: ConsentTriageTypeValue,
  dashboardBaseUrl: string = DEFAULT_DASHBOARD_BASE_URL,
): CookieTriageCopy {
  const nouns = triageType === ConsentTriageType.Cookies ? COOKIE_COPY : DATA_FLOW_COPY;
  const base = dashboardBaseUrl.replace(/\/+$/, '');
  return {
    ...nouns,
    dashboardUrl: `${base}${DASHBOARD_PATH[triageType]}`,
  };
}
