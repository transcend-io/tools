import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';

import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters.js';
import { parseLimitParam } from '../helpers/index.js';
import { createPolicyDebugParameter } from '../helpers/policyCommandParameters.js';

export const versionsCommand = buildCommand({
  loader: async () => {
    const { versions } = await import('./impl.js');
    return versions;
  },
  parameters: {
    flags: {
      'bundle-name': {
        kind: 'parsed',
        parse: String,
        brief: 'Tenant-unique policy bundle name',
      },
      auth: createAuthParameter({
        scopes: [ScopeName.ViewPolicyEngineBundles],
      }),
      'transcend-url': createTranscendUrlParameter(),
      limit: {
        kind: 'parsed',
        parse: parseLimitParam,
        brief: 'Maximum number of versions to return (1-100)',
        default: '50',
      },
      after: {
        kind: 'parsed',
        parse: String,
        brief: 'Opaque cursor from a previous response pageInfo.endCursor',
        optional: true,
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
    brief: 'List versions for a policy bundle',
    fullDescription:
      'Resolves a bundle name to its UUID and lists uploaded versions. ' +
      'Requires a Transcend API key with View Policy scope.',
  },
});
