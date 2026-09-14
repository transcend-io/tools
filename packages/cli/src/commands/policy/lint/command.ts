import { buildCommand } from '@stricli/core';

import {
  projectJsonParameter,
  projectNoInteractiveParameter,
} from '../../../lib/scaffolding/command-parameters.js';
import { policyDirectoryParameter } from '../helpers/policyCommandParameters.js';

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
      parameters: [policyDirectoryParameter],
    },
  },
  docs: {
    brief: 'Verify a local policy project with OPA and Regal',
    fullDescription:
      'Validates manifest roots and package coverage, verifies OPA 1.x and Regal, checks or repairs OPA formatting, ' +
      'runs a production-only strict OPA check, treats Regal warnings as failures, and requires non-empty OPA tests. ' +
      'No Transcend API key is needed.',
  },
});
