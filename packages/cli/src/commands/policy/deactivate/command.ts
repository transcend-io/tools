import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';

import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters.js';
import {
  createPolicyDebugParameter,
  policyBundleNameParameter,
  policyJsonParameter,
} from '../helpers/policyCommandParameters.js';

export const deactivateCommand = buildCommand({
  loader: async () => {
    const { deactivate } = await import('./impl.js');
    return deactivate;
  },
  parameters: {
    flags: {
      'bundle-name': policyBundleNameParameter,
      auth: createAuthParameter({
        scopes: [ScopeName.ActivatePolicyEngineBundles],
      }),
      'transcend-url': createTranscendUrlParameter(undefined, 'transcend-url'),
      json: policyJsonParameter,
      debug: createPolicyDebugParameter(),
    },
  },
  docs: {
    brief: 'Deactivate the active version of a policy bundle',
    fullDescription:
      'Calls the Policy Engine deactivate endpoint to take the currently active ' +
      'version of a bundle offline, clearing its active version pointer. ' +
      'Addressed by bundle name (resolved to the parent bundle UUID internally). ' +
      'Requires a Transcend API key with Activate Policy scope.',
  },
});
