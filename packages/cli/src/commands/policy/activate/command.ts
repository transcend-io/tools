import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';

import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters.js';

export const activateCommand = buildCommand({
  loader: async () => {
    const { activate } = await import('./impl.js');
    return activate;
  },
  parameters: {
    flags: {
      'bundle-name': {
        kind: 'parsed',
        parse: String,
        brief:
          'Logical policy bundle name (the same string used in publish/bundles); resolved to the parent bundle UUID internally',
      },
      version: {
        kind: 'parsed',
        parse: String,
        brief:
          'Caller-supplied version label to activate; defaults to the latest uploaded version by createdAt',
        optional: true,
      },
      auth: createAuthParameter({
        scopes: [ScopeName.ActivatePolicyEngineBundles],
      }),
      'transcend-url': createTranscendUrlParameter(),
      'dry-run': {
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
      'Addressed by bundle name (resolved to the parent bundle UUID internally). ' +
      'When --version is omitted, activates the latest uploaded version by createdAt. ' +
      'Requires a Transcend API key with Activate Policy scope.',
  },
});
