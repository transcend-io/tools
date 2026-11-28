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
        brief:
          'Overwrite source files and settings of functions already in the manifest. Local IDs, env values, and test payloads are kept.',
        default: false,
      },
      includeIds: {
        kind: 'boolean',
        brief:
          'Keep the function, data silo, and Sombra IDs of this organization in new entries. Use for same-org backups; leave off when pushing into another organization.',
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
      'Fetch custom functions from the organization and merge them into transcend-functions.yml, writing source to functions/*.ts. ' +
      'Source comes from the pending draft when there is one, else the active version. ' +
      'By default the output is ready to push into another organization: IDs are left out and env values become <<parameters.NAME>> placeholders.',
  },
});
