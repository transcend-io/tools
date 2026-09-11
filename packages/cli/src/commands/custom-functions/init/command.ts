import { buildCommand } from '@stricli/core';

/** Flags accepted when initializing Custom Function authoring. */
const customFunctionInitFlagParameters = {
  manifest: {
    kind: 'parsed',
    parse: String,
    brief: 'Path to transcend-functions.yml; defaults inside the target directory',
    optional: true,
  },
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

export const initCommand = buildCommand({
  loader: async () => {
    const { init } = await import('./impl.js');
    return init;
  },
  parameters: {
    flags: customFunctionInitFlagParameters,
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
    brief: 'Initialize a local Custom Function project',
    fullDescription:
      'Discovers the surrounding repository, previews one safe transactional plan, and creates only the selected local authoring setup. No Transcend credentials are needed.',
  },
});
