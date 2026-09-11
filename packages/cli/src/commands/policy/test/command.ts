import { buildCommand } from '@stricli/core';

import { policyDirectoryParameter } from '../helpers/policyCommandParameters.js';

export const testCommand = buildCommand({
  loader: async () => {
    const { test } = await import('./impl.js');
    return test;
  },
  parameters: {
    flags: {},
    positional: {
      kind: 'tuple',
      parameters: [policyDirectoryParameter],
    },
  },
  docs: {
    brief: 'Run OPA tests against a local policy bundle',
    fullDescription:
      'Wraps `opa test` for a local policy directory. Requires the `opa` CLI on PATH. ' +
      'No Transcend API key is needed.',
  },
});
