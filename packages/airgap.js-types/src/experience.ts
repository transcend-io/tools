// main
import { applyEnum } from '@transcend-io/type-utils';
import { IsoCountryCode } from '@transcend-io/privacy-types';

// local
import { PrivacyRegimeEnum } from './enums/privacyRegime';
import { Purpose } from './enums/purpose';
import { InitialViewState } from './enums/viewState';
import { DEFAULT_VIEW_STATE_BY_PRIVACY_REGIME } from './ui';
import { PrivacyRegime } from './core';
import {
  DEFAULT_EXPERIENCE_PURPOSE_SCOPES,
  DEFAULT_EXPERIENCE_PURPOSE_OPT_OUTS,
  REGIME_DISPLAY_PRIORITY,
  REGIME_TIMEZONES,
} from './constants';
import { BrowserLanguage, RegionsOperator } from './enums';

export interface Region {
  /** A country's ISO code */
  country: IsoCountryCode;
  /** A country subdivision ISO code */
  countrySubDivision?: string;
}

export interface ExperiencePurposeInput {
  /** name of the purpose */
  purpose: Purpose;
  /** opt out by default */
  defaultOptOut: boolean;
}

export interface ExperienceInput {
  /** The regime determining the default experience */
  name: PrivacyRegime;
  /** The display name of the experience */
  displayName: string;
  /** A list of regions to be included/not included in this experience */
  regions: Region[];
  /** A list of browser languages that this experience applies to */
  browserLanguages: string[];
  /** A list of browser time zones that this experience applies to */
  browserTimeZones: string[];
  /** Whether the listed regions are included or excluded from the experience */
  operator: RegionsOperator;
  /** If data subject linked to multiple experiences, display priority for experiences. Lower number, higher priority. */
  displayPriority: number;
  /** The view state to display on transcend.showConsentManager() */
  viewState: InitialViewState;
  /** experience purposes to be added */
  experiencePurposeInputs: ExperiencePurposeInput[];
}

// default to []
// Don't put this into constants or you will regret it (per the constants.ts warning)
export const REGIME_REGIONS: Record<PrivacyRegime, Region[]> = {
  CPRA: [{ country: 'US', countrySubDivision: 'US-CA' }],
  GDPR: [
    { country: 'EU' },
    { country: 'GB' },
    { country: 'NO' },
    { country: 'IS' },
    { country: 'LI' },
  ],
  LGPD: [{ country: 'BR' }],
  CDPA: [{ country: 'US', countrySubDivision: 'US-VA' }],
  CPA: [{ country: 'US', countrySubDivision: 'US-CO' }],
  UCPA: [{ country: 'US', countrySubDivision: 'US-UT' }],
  NEVADA_SB220: [{ country: 'US', countrySubDivision: 'US-NV' }],
  nFADP: [{ country: 'CH' }],
};

// default to []
// Don't put this into constants or you will regret it (per the constants.ts warning)
export const REGIME_LANGUAGES: Record<PrivacyRegime, string[]> = {
  GDPR: [
    BrowserLanguage['Bulgarian (Bulgaria)'],
    BrowserLanguage['Croatian (Croatia)'],
    BrowserLanguage['Czech (Czech Republic)'],
    BrowserLanguage['Danish (Denmark)'],
    BrowserLanguage['Dutch (Belgium)'],
    BrowserLanguage['Dutch (Netherlands)'],
    BrowserLanguage['English (Ireland)'],
    BrowserLanguage['Estonian (Estonia)'],
    BrowserLanguage['Finnish (Finland)'],
    BrowserLanguage['French (Belgium)'],
    BrowserLanguage['French (France)'],
    BrowserLanguage['French (Luxembourg)'],
    BrowserLanguage['German (Austria)'],
    BrowserLanguage['German (Germany)'],
    BrowserLanguage['German (Liechtenstein)'],
    BrowserLanguage['German (Luxembourg)'],
    BrowserLanguage['Greek (Greece)'],
    BrowserLanguage['Hungarian (Hungary)'],
    BrowserLanguage['Icelandic (Iceland)'],
    BrowserLanguage['Irish (Ireland)'],
    BrowserLanguage['Italian (Italy)'],
    BrowserLanguage['Latvian (Latvia)'],
    BrowserLanguage['Lithuanian (Lithuania)'],
    BrowserLanguage['Maltese (Malta)'],
    BrowserLanguage['Norwegian (Norway)'],
    BrowserLanguage['Norwegian Bokmål (Norway)'],
    BrowserLanguage['Norwegian Nynorsk (Norway)'],
    BrowserLanguage['Polish (Poland)'],
    BrowserLanguage['Portuguese (Portugal)'],
    BrowserLanguage['Romanian (Romania)'],
    BrowserLanguage['Slovak (Slovakia)'],
    BrowserLanguage['Slovenian (Slovenia)'],
    BrowserLanguage['Spanish (Espa\u00f1a)'],
    BrowserLanguage['Swedish (Finland)'],
    BrowserLanguage['Swedish (Finland)'],
    BrowserLanguage['Swedish (Sweden)'],
  ],
  LGPD: [BrowserLanguage['Portuguese (Brazil)']],
  nFADP: [
    BrowserLanguage['German (Switzerland)'],
    BrowserLanguage['French (Switzerland)'],
    BrowserLanguage['Italian (Switzerland)'],
    BrowserLanguage['English (Switzerland)'],
    BrowserLanguage['Portuguese (Switzerland)'],
    BrowserLanguage['Swiss German (Switzerland)'],
  ],
};

/**
 * construct default experience for regime
 *
 * @param regime - regime
 * @returns ExperienceInput
 */
export function defaultExperience(regime: PrivacyRegime): ExperienceInput {
  const isUnknown = regime === 'Unknown';
  const regimeEnum =
    PrivacyRegimeEnum[regime as keyof typeof PrivacyRegimeEnum];
  return {
    name: regime,
    displayName: regime,
    regions: REGIME_REGIONS[regime] ?? [],
    operator: isUnknown ? RegionsOperator.NotIn : RegionsOperator.In,
    displayPriority: REGIME_DISPLAY_PRIORITY[regime] ?? 20,
    viewState:
      DEFAULT_VIEW_STATE_BY_PRIVACY_REGIME[regimeEnum] ??
      InitialViewState.Hidden,
    browserLanguages: REGIME_LANGUAGES[regime] ?? [],
    browserTimeZones: REGIME_TIMEZONES[regime] ?? [],
    experiencePurposeInputs: DEFAULT_EXPERIENCE_PURPOSE_SCOPES[regime].map(
      (purpose: Purpose) => ({
        purpose,
        defaultOptOut:
          DEFAULT_EXPERIENCE_PURPOSE_OPT_OUTS[regime]?.includes(purpose) ??
          false,
      }),
    ),
  };
}

export const DEFAULT_EXPERIENCES = applyEnum(
  PrivacyRegimeEnum,
  defaultExperience,
);
