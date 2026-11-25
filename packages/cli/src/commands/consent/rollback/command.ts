import { buildCommand } from '@stricli/core';
import { ConsentBundleType, ScopeName } from '@transcend-io/privacy-types';

import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters.js';

export const rollbackCommand = buildCommand({
  loader: async () => {
    const { rollback } = await import('./impl.js');
    return rollback;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ManageConsentManagerDeveloperSettings],
      }),
      bundleTypes: {
        kind: 'enum',
        values: Object.values(ConsentBundleType),
        brief: 'The bundle types to roll back. Required, there is no default.',
        variadic: ',',
      },
      version: {
        kind: 'parsed',
        parse: String,
        brief:
          'The airgap.js version to roll back to. It must be an earlier deploy of each bundle type.',
      },
      dryRun: {
        kind: 'boolean',
        brief: 'Look up the rollback targets and print them without rolling back',
        default: false,
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Roll back consent manager',
    fullDescription:
      'Roll the Consent Manager bundle back to the module versions of an earlier deploy. You must pass the bundle types and the airgap.js version to roll back to. Every target is looked up before anything changes, so a missing version changes nothing.',
  },
});
