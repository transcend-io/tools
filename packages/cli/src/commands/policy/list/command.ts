import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';

import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters.js';

export const listCommand = buildCommand({
  loader: async () => {
    const { list } = await import('./impl.js');
    return list;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ViewPolicyEngineBundles],
      }),
      transcendUrl: createTranscendUrlParameter(),
      limit: {
        kind: 'parsed',
        parse: (value: string) => {
          const parsed = Number(value);
          if (!Number.isFinite(parsed) || parsed <= 0) {
            throw new Error('limit must be a positive number');
          }
          return parsed;
        },
        brief: 'Maximum number of bundles to return',
        default: '50',
      },
      offset: {
        kind: 'parsed',
        parse: (value: string) => {
          const parsed = Number(value);
          if (!Number.isFinite(parsed) || parsed < 0) {
            throw new Error('offset must be a non-negative number');
          }
          return parsed;
        },
        brief: 'Number of records to skip before returning results',
        default: '0',
      },
      json: {
        kind: 'boolean',
        brief: 'Print the raw JSON API response',
        default: false,
      },
    },
  },
  docs: {
    brief: 'List policy bundles for the current organization',
    fullDescription:
      'Lists policy bundles registered for the authenticated organization. ' +
      'Requires a Transcend API key with View Policy scope.',
  },
});
