import { buildCommand } from '@stricli/core';

export const checkCommand = buildCommand({
  loader: async () => {
    const { check } = await import('./impl.js');
    return check;
  },
  parameters: {
    flags: {
      manifest: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to transcend-functions.yml; defaults inside the target directory',
        optional: true,
      },
      parameters: {
        kind: 'parsed',
        parse: String,
        brief: 'Comma-separated parameter values used in manifest paths',
        default: '',
      },
      variables: {
        kind: 'parsed',
        parse: String,
        brief: 'Deprecated alias for --parameters',
        default: '',
      },
      fix: {
        kind: 'boolean',
        brief: 'Apply Deno formatting to manifest-referenced files',
        default: false,
      },
      noInteractive: {
        kind: 'boolean',
        brief: 'Disable the optional formatting confirmation',
        default: false,
      },
      json: {
        kind: 'boolean',
        brief: 'Emit a stable JSON result and imply non-interactive behavior',
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
    brief: 'Validate a local Custom Function project without credentials',
    fullDescription:
      'Checks manifest semantics and published payload schemas, then uses Deno 2 without executing user modules to inspect exports, type-check, lint, and verify formatting.',
  },
});
