import { buildCommand } from '@stricli/core';

import {
  projectDryRunParameter,
  projectJsonParameter,
  projectNoInteractiveParameter,
  projectYesParameter,
} from '../../../lib/scaffolding/command-parameters.js';
import { customFunctionDirectoryParameter, customFunctionManifestParameter } from '../constants.js';

/** Flags accepted when initializing Custom Function authoring. */
const customFunctionInitFlagParameters = {
  manifest: customFunctionManifestParameter,
  deno: {
    kind: 'boolean',
    brief: 'Create or merge target-scoped Deno configuration and check task',
    optional: true,
  },
  editor: {
    kind: 'boolean',
    brief: 'Merge target-scoped Deno editor settings and recommendations',
    optional: true,
  },
  skill: {
    kind: 'boolean',
    brief: 'Install the canonical Custom Function coding-agent skill',
    optional: true,
  },
  ci: {
    kind: 'boolean',
    brief: 'Generate credential-free GitHub Actions checks',
    optional: true,
  },
  noInteractive: projectNoInteractiveParameter,
  dryRun: projectDryRunParameter,
  yes: projectYesParameter,
  json: projectJsonParameter,
} as const;

export const initCommand = buildCommand({
  loader: async () => {
    const { init } = await import('./impl.js');
    return init;
  },
  parameters: {
    flags: customFunctionInitFlagParameters,
    positional: {
      kind: 'tuple',
      parameters: [customFunctionDirectoryParameter],
    },
  },
  docs: {
    brief: 'Initialize a local Custom Function project',
    fullDescription:
      'Discovers the surrounding repository, previews one safe transactional plan, and creates only the selected local authoring setup. No Transcend credentials are needed.',
  },
});
