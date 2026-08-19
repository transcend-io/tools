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
        scopes: [ScopeName.ViewDataMap],
      }),
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'List custom functions and their versions',
    fullDescription:
      'List all custom functions in the organization along with their lifecycle state, active version, and any pending draft version.',
  },
});
