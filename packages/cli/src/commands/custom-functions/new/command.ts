import { buildCommand } from '@stricli/core';

import { CUSTOM_FUNCTION_TEMPLATE_NAMES } from '../../../lib/custom-functions/scaffold-templates.js';
import {
  projectDryRunParameter,
  projectJsonParameter,
  projectNoInteractiveParameter,
  projectYesParameter,
} from '../../../lib/scaffolding/command-parameters.js';
import { customFunctionDirectoryParameter, customFunctionManifestParameter } from '../constants.js';

/** Flags accepted when adding a function to an initialized project. */
const customFunctionNewFlagParameters = {
  manifest: customFunctionManifestParameter,
  name: {
    kind: 'parsed',
    parse: String,
    brief: 'Customer-visible Custom Function display name',
    optional: true,
  },
  template: {
    kind: 'enum',
    values: CUSTOM_FUNCTION_TEMPLATE_NAMES,
    brief: 'Function type and generated handler shape',
    optional: true,
  },
  noInteractive: projectNoInteractiveParameter,
  dryRun: projectDryRunParameter,
  yes: projectYesParameter,
  json: projectJsonParameter,
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
      parameters: [customFunctionDirectoryParameter],
    },
  },
  docs: {
    brief: 'Scaffold one local Custom Function and its test fixtures',
    fullDescription:
      'Adds a deterministic starter for one of two Custom Function types: General functions triggered by Rules Automation, or DSR functions triggered by a Workflow step and supporting data point resolvers, preflight checks, or both.',
  },
});
