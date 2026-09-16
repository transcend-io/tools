import { buildCommand } from '@stricli/core';

import { projectNoInteractiveParameter } from '../../../lib/scaffolding/command-parameters.js';
import {
  customFunctionDirectoryParameter,
  customFunctionManifestParameter,
  customFunctionVariablesParameter,
} from '../constants.js';

export const runCommand = buildCommand({
  loader: async () => {
    const { run } = await import('./impl.js');
    return run;
  },
  parameters: {
    flags: {
      manifest: customFunctionManifestParameter,
      function: {
        kind: 'parsed',
        parse: String,
        brief: 'Exact Custom Function name or ID; prompts when omitted',
        optional: true,
      },
      variables: customFunctionVariablesParameter,
      noInteractive: projectNoInteractiveParameter,
      allowNetwork: {
        kind: 'boolean',
        brief: 'Permit real native fetch calls to manifest allowed-hosts',
        default: false,
      },
    },
    positional: {
      kind: 'tuple',
      parameters: [customFunctionDirectoryParameter],
    },
  },
  docs: {
    brief: 'Run Custom Function fixtures in a local Deno simulator',
    fullDescription:
      'Executes one self-contained manifest function against its configured test payloads with production-like payload preparation, restricted Deno permissions, an in-memory KV store, and a simulated sdk.fetch implementation. No credentials are required. Native fetch is disabled unless --allowNetwork is passed; module imports follow allow-third-party-imports.',
  },
});
