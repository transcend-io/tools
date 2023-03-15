// external
import * as t from 'io-ts';

// main
import { FixedLengthArray } from '@transcend-io/type-utils';

// local
import type { PrivacyRegime, TrackingPurpose } from '../core';

/** Regime purpose scopes configuration */
export const RegimePurposeScopesConfig = t.array(
  FixedLengthArray(2, 2, t.array(t.string)),
);
/** Type override */
export type RegimePurposeScopesConfig = [
  /** Regimes */
  regimes: string[],
  /** In-scope purposes */
  purposes: TrackingPurpose[],
][];

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
