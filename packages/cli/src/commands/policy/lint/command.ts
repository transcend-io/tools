import { buildCommand } from '@stricli/core';

import {
  projectJsonParameter,
  projectNoInteractiveParameter,
} from '../../../lib/scaffolding/command-parameters.js';
import { policyWorkspaceOrBundleDirectoryParameter } from '../helpers/policyCommandParameters.js';

export const lintCommand = buildCommand({
  loader: async () => {
    const { lint } = await import('./impl.js');
    return lint;
  },
  parameters: {
    flags: {
      fix: {
        kind: 'boolean',
        brief: 'Apply OPA formatting without running broad Regal fixes',
        default: false,
      },
      noInteractive: {
        ...projectNoInteractiveParameter,
        brief: 'Disable the optional formatting confirmation',
      },
      json: projectJsonParameter,
    },
    positional: {
      kind: 'tuple',
      parameters: [policyWorkspaceOrBundleDirectoryParameter],
    },
  },
  docs: {
    brief: 'Lint local policy bundles with OPA formatting and Regal',
    fullDescription:
      'Defaults to the policy workspace (`transcend/policy`) and lints every publishable ' +
      'child directory that contains a `.manifest`. Pass one bundle path to lint a single unit. ' +
      'Verifies OPA 1.x and Regal, checks or repairs OPA formatting, and treats Regal warnings as failures. ' +
      'For the full verification gate (manifest, strict OPA check, and tests), use `transcend policy check`. ' +
      'No Transcend API key is needed.',
  },
});
