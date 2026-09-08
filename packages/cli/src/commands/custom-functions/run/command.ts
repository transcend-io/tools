import { buildCommand } from '@stricli/core';

export const runCommand = buildCommand({
  loader: async () => {
    const { run } = await import('./impl.js');
    return run;
  },
  parameters: {
    flags: {
      manifest: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to transcend-functions.yml; defaults inside the target directory',
        optional: true,
      },
      function: {
        kind: 'parsed',
        parse: String,
        brief: 'Exact Custom Function name or ID; prompts when omitted',
        optional: true,
      },
      variables: {
        kind: 'parsed',
        parse: String,
        brief: 'Comma-separated parameter values such as apiKey:value',
        default: '',
      },
      noInteractive: {
        kind: 'boolean',
        brief: 'Disable function selection prompts',
        default: false,
      },
      allowNetwork: {
        kind: 'boolean',
        brief: 'Permit real native fetch calls to manifest allowed-hosts',
        default: false,
      },
    },
    positional: {
      kind: 'tuple',
      parameters: [
        {
          brief: 'Custom Function project directory',
          placeholder: 'directory',
          parse: String,
          optional: true,
          default: 'transcend/custom-functions',
        },
      ],
    },
  },
  docs: {
    brief: 'Run Custom Function fixtures in a local Deno simulator',
    fullDescription:
      'Executes one manifest function against its configured test payloads with production-like payload preparation, restricted Deno permissions, an in-memory KV store, and a simulated sdk.fetch implementation. No credentials are required, and real network requests are disabled unless --allowNetwork is passed.',
  },
});
