import { buildCommand } from '@stricli/core';
import { ConsentBundleType, ScopeName } from '@transcend-io/privacy-types';

import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters.js';

export const previewDeployCommand = buildCommand({
  loader: async () => {
    const { previewDeploy } = await import('./impl.js');
    return previewDeploy;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ViewConsentManager],
      }),
      bundleTypes: {
        kind: 'enum',
        values: Object.values(ConsentBundleType),
        brief: 'The bundle types to preview. Defaults to TEST,PRODUCTION.',
        variadic: ',',
        optional: true,
      },
      json: {
        kind: 'boolean',
        brief: 'Print the result as JSON instead of a text summary',
        default: false,
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Preview consent manager deploy',
    fullDescription:
      'Show what deploying the Consent Manager would change, by comparing the saved configuration with the deployed bundle. This command is read-only and exits with code 0 unless an error occurs.',
  },
});
