import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';

import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters.js';
import { projectJsonParameter } from '../../../lib/scaffolding/command-parameters.js';
import { customFunctionDirectoryParameter, customFunctionManifestParameter } from '../constants.js';

export const pullCommand = buildCommand({
  loader: async () => {
    const { pull } = await import('./impl.js');
    return pull;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ViewDataMap],
      }),
      transcendUrl: createTranscendUrlParameter(),
      manifest: customFunctionManifestParameter,
      force: {
        kind: 'boolean',
        brief: 'Overwrite an existing manifest and source files',
        default: false,
      },
      json: projectJsonParameter,
    },
    positional: {
      kind: 'tuple',
      parameters: [customFunctionDirectoryParameter],
    },
  },
  docs: {
    brief: 'Download custom functions into a local manifest project',
    fullDescription:
      'Fetch custom functions from the organization, decode active (or pending draft) source from signed JWTs, ' +
      'and write transcend-functions.yml plus functions/*.ts under the project directory. ' +
      'Encrypted env var values cannot be recovered; only execution context metadata is copied.',
  },
});
