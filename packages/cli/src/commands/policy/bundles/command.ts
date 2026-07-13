import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';

import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters.js';
import { parseLimitParam, parseOffsetParam } from '../helpers/index.js';
import { createPolicyDebugParameter } from '../helpers/policyCommandParameters.js';

export const bundlesCommand = buildCommand({
  loader: async () => {
    const { bundles } = await import('./impl.js');
    return bundles;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ViewPolicyEngineBundles],
      }),
      'transcend-url': createTranscendUrlParameter(),
      limit: {
        kind: 'parsed',
        parse: parseLimitParam,
        brief: 'Maximum number of bundles to return (1-100)',
        default: '50',
      },
      offset: {
        kind: 'parsed',
        parse: parseOffsetParam,
        brief: 'Number of records to skip before returning results',
        default: '0',
      },
      json: {
        kind: 'boolean',
        brief: 'Print the raw JSON API response',
        default: false,
      },
      debug: createPolicyDebugParameter(),
    },
  },
  docs: {
    brief: 'List policy bundles for the current organization',
    fullDescription:
      'Lists policy bundles registered for the authenticated organization. ' +
      'Requires a Transcend API key with View Policy scope.',
  },
});
