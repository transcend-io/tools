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
  REGIME_REGIONS,
  REGIME_DISPLAY_PRIORITY,
  REGIME_LANGUAGES,
  REGIME_TIMEZONES,
} from './constants';
import { RegionsOperator } from './enums';

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
