import type {
  PrivacyRegime,
  RegimePurposeScopesConfig,
  TrackingPurpose,
} from './core';

/* --------------------------------------------------------------------------------
 * NOTE: PLEASE DON'T IMPORT ANYTHING BESIDES TYPES INTO THIS FILE.
 * (or make -absolutely- certain it leaves a miniscule build footprint).
 * Constants from this file are imported directly into airgap (core/init.ts)
 * and if you import something that leaves traces it -will- bloat the airgap build.
 * -------------------------------------------------------------------------------- */

export const UNKNOWN_DEFAULT_EXPERIENCE = 'Unknown';

export const GDPR_PURPOSES: [PrivacyRegime[], TrackingPurpose[]] = [
  ['GDPR'],
  ['Advertising', 'Analytics', 'Functional'],
];

export const LGPD_NFADP_PURPOSES: [PrivacyRegime[], TrackingPurpose[]] = [
  ['LGPD', 'nFADP'],
  ['Advertising', 'Analytics', 'Functional', 'SaleOfInfo'],
];

export const DEFAULT_REGIME_TRACKING_PURPOSE_SCOPES: RegimePurposeScopesConfig =
  [
    GDPR_PURPOSES,
    LGPD_NFADP_PURPOSES,
    [['CPRA', 'CDPA', 'CPA', 'NEVADA_SB220', 'US_DNSS'], ['SaleOfInfo']],
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
  LGPD_NFADP_PURPOSES,
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
export const REGIME_TIMEZONES: Record<PrivacyRegime, string[]> = {};

// default to 20
export const REGIME_DISPLAY_PRIORITY: Record<PrivacyRegime, number> = {
  GDPR: 10,
  Unknown: 100,
};

/* eslint-disable max-len */
/**
 * These TCF Purposes cannot be allowed to process under legitimate interest legal basis
 * Source:
 * https://iabeurope.eu/iab-europe-transparency-consent-framework-policies/#:~:text=Appendix%20A:%20Definitions%20Of%20Purposes,%20Features%20And%20Categories%20Of%20Data
 */
export const DEFAULT_RESTRICT_LEGIT_INTEREST_PROCESSING = [1, 3, 4, 5, 6];
/* eslint-enable max-len */
