import { buildCommand } from '@stricli/core';

export const initCommand = buildCommand({
  loader: async () => {
    const { init } = await import('./impl.js');
    return init;
  },
  parameters: {
    flags: {
      noInteractive: {
        kind: 'boolean',
        brief: 'Disable prompts and require final approval with --yes',
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
        brief: 'Emit one stable JSON result and imply non-interactive output',
        default: false,
      },
    },
    positional: {
      kind: 'tuple',
      parameters: [
        {
          brief: 'Policy project directory',
          placeholder: 'directory',
          parse: String,
          optional: true,
          default: 'transcend/policy',
        },
      ],
    },
  },
  docs: {
    brief: 'Initialize a safe local policy project',
    fullDescription:
      'Probes OPA and Regal, previews one safe transactional plan, and creates a publishable fail-closed Rego v1 starter only in an empty target. Existing policy content is never overwritten. No Transcend credentials are needed.',
  },
});
