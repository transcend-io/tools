import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';

import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters.js';
import { uuidParser } from '../../../lib/cli/parsers.js';

export const activateCommand = buildCommand({
  loader: async () => {
    const { activate } = await import('./impl.js');
    return activate;
  },
  parameters: {
    flags: {
      version: {
        kind: 'parsed',
        parse: String,
        brief:
          'Caller-supplied version label to activate; defaults to the latest uploaded version by createdAt',
        optional: true,
      },
      policyBundleId: {
        kind: 'parsed',
        parse: uuidParser,
        brief: 'Parent policy bundle UUID',
        optional: true,
      },
      bundleName: {
        kind: 'parsed',
        parse: String,
        brief: 'Parent bundle name (used when policyBundleId is omitted)',
        optional: true,
      },
      auth: createAuthParameter({
        scopes: [ScopeName.ActivatePolicyEngineBundles],
      }),
      transcendUrl: createTranscendUrlParameter(),
      dryRun: {
        kind: 'boolean',
        brief: 'Validate activation without flipping the active version',
        default: false,
      },
      json: {
        kind: 'boolean',
        brief: 'Print the raw JSON API response',
        default: false,
      },
    },
  },
  docs: {
    brief: 'Activate an uploaded policy bundle version',
    fullDescription:
      'Calls the Policy Engine activate endpoint to make an uploaded version live. ' +
      'Requires the parent bundle UUID or bundle name. When --version is omitted, ' +
      'activates the latest uploaded version by createdAt. ' +
      'Requires a Transcend API key with Activate Policy scope.',
  },
});
