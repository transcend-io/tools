import { buildCommand } from '@stricli/core';

import {
  projectJsonParameter,
  projectNoInteractiveParameter,
} from '../../../lib/scaffolding/command-parameters.js';
import {
  customFunctionDirectoryParameter,
  customFunctionManifestParameter,
  customFunctionVariablesParameter,
} from '../constants.js';

export const checkCommand = buildCommand({
  loader: async () => {
    const { check } = await import('./impl.js');
    return check;
  },
  parameters: {
    flags: {
      manifest: customFunctionManifestParameter,
      variables: customFunctionVariablesParameter,
      fix: {
        kind: 'boolean',
        brief: 'Apply Deno formatting to manifest-referenced files',
        default: false,
      },
      noInteractive: projectNoInteractiveParameter,
      json: projectJsonParameter,
    },
    positional: {
      kind: 'tuple',
      parameters: [customFunctionDirectoryParameter],
    },
  },
  docs: {
    brief: 'Validate a local Custom Function project without credentials',
    fullDescription:
      'Checks manifest semantics and published payload schemas, then uses Deno 2 without executing user modules to inspect exports, type-check, lint, and verify formatting.',
  },
});
