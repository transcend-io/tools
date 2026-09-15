import { buildCommand } from '@stricli/core';

import { policyBundleDirectoryParameter } from '../helpers/policyCommandParameters.js';

export const evalCommand = buildCommand({
  loader: async () => {
    const { _eval } = await import('./impl.js');
    return _eval;
  },
  parameters: {
    flags: {
      pkg: {
        kind: 'parsed',
        parse: String,
        brief: 'OPA package or query to evaluate (e.g. data.transcend.decision)',
      },
      input: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to a JSON envelope input file',
      },
    },
    positional: {
      kind: 'tuple',
      parameters: [policyBundleDirectoryParameter],
    },
  },
  docs: {
    brief: 'Evaluate one envelope against a local policy bundle',
    fullDescription:
      'Wraps `opa eval` for local policy debugging against one bundle directory. ' +
      'Requires an explicit directory containing a `.manifest`, and the `opa` CLI on PATH. ' +
      'No Transcend API key is needed.',
  },
});
