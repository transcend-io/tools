import { buildCommand } from '@stricli/core';

import {
  customFunctionDirectoryPositionalParameters,
  customFunctionScaffoldFlagParameters,
} from '../shared/command-parameters.js';

export const initCommand = buildCommand({
  loader: async () => {
    const { init } = await import('./impl.js');
    return init;
  },
  parameters: {
    flags: customFunctionScaffoldFlagParameters,
    positional: customFunctionDirectoryPositionalParameters,
  },
  docs: {
    brief: 'Initialize a local Custom Function project',
    fullDescription:
      'Discovers the surrounding repository, previews one safe transactional plan, and creates only the selected local authoring setup. No Transcend credentials are needed.',
  },
});
