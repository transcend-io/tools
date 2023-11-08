import type {
  PrivacyRegime,
  RegimePurposeScopesConfig,
  TrackingPurpose,
} from './core';
import { BrowserLanguage } from './enums/browserLanguage';
import { Region } from './experience';

export const UNKNOWN_DEFAULT_EXPERIENCE = 'Unknown';

export const GDPR_PURPOSES: [PrivacyRegime[], TrackingPurpose[]] = [
  ['GDPR', 'LGPD', 'nFADP'],
  ['Advertising', 'Analytics', 'Functional', 'SaleOfInfo'],
];

export const DEFAULT_REGIME_TRACKING_PURPOSE_SCOPES: RegimePurposeScopesConfig =
  [
    GDPR_PURPOSES,
    [['CPRA', 'CDPA', 'CPA', 'NEVADA_SB220'], ['SaleOfInfo']],
    [
      [
        UNKNOWN_DEFAULT_EXPERIENCE,
        // 'UCPA'
      ],
      [],
    ],
  ];

export const DEFAULT_REGIME_PURPOSE_OPT_OUTS: RegimePurposeScopesConfig = [
  GDPR_PURPOSES,
];

export const DEFAULT_EXPERIENCE_PURPOSE_OPT_OUTS = Object.fromEntries(
  DEFAULT_REGIME_PURPOSE_OPT_OUTS.map(([regimes, purposes]) =>
    regimes.map((regime) => [regime, purposes]),
  ).flat(),
);

export const DEFAULT_EXPERIENCE_PURPOSE_SCOPES = Object.fromEntries(
  DEFAULT_REGIME_TRACKING_PURPOSE_SCOPES.map(([regimes, purposes]) =>
    regimes.map((regime) => [regime, purposes]),
  ).flat(),
);

// default to []
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

// default to []
export const REGIME_TIMEZONES: Record<PrivacyRegime, string[]> = {};

// default to 20
export const REGIME_DISPLAY_PRIORITY: Record<PrivacyRegime, number> = {
  GDPR: 10,
  Unknown: 100,
};
