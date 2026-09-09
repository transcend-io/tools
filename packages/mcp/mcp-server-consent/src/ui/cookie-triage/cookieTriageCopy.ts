import type { ConsentTriageType } from '../../lib/cookieTriageTypes.ts';

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

const COOKIE_COPY: CookieTriageCopy = {
  singular: 'cookie',
  plural: 'cookies',
  singularTitle: 'Cookie',
  pluralTitle: 'Cookies',
  dashboardUrl: 'https://app.transcend.io/consent-manager/cookies',
};

const DATA_FLOW_COPY: CookieTriageCopy = {
  singular: 'data flow',
  plural: 'data flows',
  singularTitle: 'Data flow',
  pluralTitle: 'Data flows',
  dashboardUrl: 'https://app.transcend.io/consent-manager/data-flows',
};

/** Nouns and dashboard URL for the active triage type. */
export function triageCopy(triageType: ConsentTriageType): CookieTriageCopy {
  return triageType === 'cookies' ? COOKIE_COPY : DATA_FLOW_COPY;
}
