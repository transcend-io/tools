import { buildCommand } from '@stricli/core';

import { policyWorkspaceOrBundleDirectoryParameter } from '../helpers/policyCommandParameters.js';

export const testCommand = buildCommand({
  loader: async () => {
    const { test } = await import('./impl.js');
    return test;
  },
  parameters: {
    flags: {},
    positional: {
      kind: 'tuple',
      parameters: [policyWorkspaceOrBundleDirectoryParameter],
    },
  },
  docs: {
    brief: 'Run OPA tests against local policy bundles',
    fullDescription:
      'Defaults to the policy workspace (`transcend/policy`) and runs `opa test -b` for every ' +
      'child directory that contains a `.manifest`. Pass one bundle path to test a single unit. ' +
      'Requires the `opa` CLI on PATH. No Transcend API key is needed.',
  },
});
