import { buildCommand } from '@stricli/core';

import { POLICY_TEMPLATE_NAMES } from '../../../lib/policy/policy-scaffold-templates.js';
import {
  projectDryRunParameter,
  projectJsonParameter,
  projectNoInteractiveParameter,
  projectYesParameter,
} from '../../../lib/scaffolding/command-parameters.js';
import { policyWorkspaceDirectoryParameter } from '../helpers/policyCommandParameters.js';

export const newCommand = buildCommand({
  loader: async () => {
    const { _new } = await import('./impl.js');
    return _new;
  },
  parameters: {
    flags: {
      name: {
        kind: 'parsed',
        parse: String,
        brief: 'Package root name (used as {name}-bundle/ directory)',
        optional: true,
      },
      template: {
        kind: 'enum',
        values: POLICY_TEMPLATE_NAMES,
        brief: 'Bundle template',
        optional: true,
      },
      noInteractive: {
        ...projectNoInteractiveParameter,
        brief: 'Disable prompts and require explicit --name and --template',
      },
      dryRun: projectDryRunParameter,
      yes: projectYesParameter,
      json: projectJsonParameter,
    },
    positional: {
      kind: 'tuple',
      parameters: [policyWorkspaceDirectoryParameter],
    },
  },
  docs: {
    brief: 'Scaffold one policy bundle from a template',
    fullDescription:
      'Adds a publishable `{name}-bundle/` directory to an initialized policy workspace. ' +
      'Requires `.regal/config.yaml` (run `transcend policy init` first). ' +
      'Creates bundle files, merges the root into Regal config, and updates editor setup when present.',
  },
});
