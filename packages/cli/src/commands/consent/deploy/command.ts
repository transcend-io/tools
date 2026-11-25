import { buildCommand, numberParser } from '@stricli/core';
import { ConsentBundleType, ScopeName } from '@transcend-io/privacy-types';

import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters.js';

export const deployCommand = buildCommand({
  loader: async () => {
    const { deploy } = await import('./impl.js');
    return deploy;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ManageConsentManagerDeveloperSettings],
      }),
      bundleTypes: {
        kind: 'enum',
        values: Object.values(ConsentBundleType),
        brief:
          'The bundle types to deploy. Defaults to TEST,PRODUCTION. TEST is always deployed before PRODUCTION.',
        variadic: ',',
        optional: true,
      },
      expectBundleId: {
        kind: 'parsed',
        parse: String,
        brief:
          'Abort unless the Consent Manager ID of the organization matches this value. Protects against deploying with the wrong API key.',
        optional: true,
      },
      wait: {
        kind: 'boolean',
        brief:
          'Wait for each deploy to finish before continuing. Fails if the deploy ends in an error state.',
        default: false,
      },
      waitTimeoutSeconds: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'Max seconds to wait for each deploy when --wait is set',
        default: '600',
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Deploy consent manager',
    fullDescription:
      'Deploy the Consent Manager bundle without changing the airgap.js version. Use this when the airgap.js version is pinned. To update airgap.js to the latest version first, use `transcend consent update-consent-manager --deploy`. TEST is deployed before PRODUCTION, one at a time, and the command stops at the first failure.',
  },
});
