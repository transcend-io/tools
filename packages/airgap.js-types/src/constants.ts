import type {
  PrivacyRegime,
  RegimePurposeScopesConfig,
  TrackingPurpose,
} from './core';

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
