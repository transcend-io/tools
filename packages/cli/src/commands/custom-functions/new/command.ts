import { buildCommand } from '@stricli/core';

import { CUSTOM_FUNCTION_TEMPLATE_NAMES } from '../../../lib/custom-functions/scaffold-templates.js';

/** Flags accepted when adding a function to an initialized project. */
const customFunctionNewFlagParameters = {
  manifest: {
    kind: 'parsed',
    parse: String,
    brief: 'Path to an existing transcend-functions.yml',
    optional: true,
  },
  name: {
    kind: 'parsed',
    parse: String,
    brief: 'Customer-visible Custom Function display name',
    optional: true,
  },
  template: {
    kind: 'enum',
    values: CUSTOM_FUNCTION_TEMPLATE_NAMES,
    brief: 'Generated handler and fixture shape',
    optional: true,
  },
  noInteractive: {
    kind: 'boolean',
    brief: 'Disable prompts and require every missing answer as a flag',
    default: false,
  },
  dryRun: {
    kind: 'boolean',
    brief: 'Preview all changes without writing files',
    default: false,
  },
  yes: {
    kind: 'boolean',
    brief: 'Skip only the final plan confirmation',
    default: false,
  },
  json: {
    kind: 'boolean',
    brief: 'Emit a stable JSON result and imply non-interactive output',
    default: false,
  },
} as const;

export const newCommand = buildCommand({
  loader: async () => {
    const { _new } = await import('./impl.js');
    return _new;
  },
  parameters: {
    flags: customFunctionNewFlagParameters,
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
    brief: 'Scaffold one local Custom Function and its test fixtures',
    fullDescription:
      'Adds a deterministic General or DSR starter to an initialized Custom Function project and safely appends its manifest entry without credentials.',
  },
});
