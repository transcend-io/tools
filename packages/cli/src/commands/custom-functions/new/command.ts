import { buildCommand } from '@stricli/core';

import {
  customFunctionDirectoryPositionalParameters,
  customFunctionNewFlagParameters,
} from '../shared/command-parameters.js';

export const newCommand = buildCommand({
  loader: async () => {
    const { _new } = await import('./impl.js');
    return _new;
  },
  parameters: {
    flags: customFunctionNewFlagParameters,
    positional: customFunctionDirectoryPositionalParameters,
  },
  docs: {
    brief: 'Scaffold one local Custom Function and its test fixtures',
    fullDescription:
      'Creates a deterministic General or DSR starter, composes missing initialization into the same preview, and safely appends the manifest entry without credentials.',
  },
});
