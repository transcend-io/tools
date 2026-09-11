import { buildCommand } from '@stricli/core';

import {
  projectDryRunParameter,
  projectJsonParameter,
  projectNoInteractiveParameter,
  projectYesParameter,
} from '../../../lib/scaffolding/command-parameters.js';
import { policyDirectoryParameter } from '../helpers/policyCommandParameters.js';

export const initCommand = buildCommand({
  loader: async () => {
    const { init } = await import('./impl.js');
    return init;
  },
  parameters: {
    flags: {
      editor: {
        kind: 'boolean',
        brief: 'Merge strict target-scoped VS Code settings, extensions, and lint task',
        optional: true,
      },
      skill: {
        kind: 'boolean',
        brief: 'Install the canonical Policy Engine coding-agent skill',
        optional: true,
      },
      ci: {
        kind: 'boolean',
        brief: 'Generate credential-free validation-only GitHub Actions',
        optional: true,
      },
      noInteractive: {
        ...projectNoInteractiveParameter,
        brief: 'Disable prompts and enable optional setup only through explicit flags',
      },
      dryRun: projectDryRunParameter,
      yes: projectYesParameter,
      json: projectJsonParameter,
    },
    positional: {
      kind: 'tuple',
      parameters: [policyDirectoryParameter],
    },
  },
  docs: {
    brief: 'Initialize a safe local policy project',
    fullDescription:
      'Probes OPA and Regal, previews one safe transactional plan, and creates a publishable fail-closed Rego v1 starter only in an empty target. Optional editor, Agent Skill, and validation-only CI setup preserve repository customization. No Transcend credentials are needed.',
  },
});
