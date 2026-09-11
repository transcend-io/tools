import { buildCommand } from '@stricli/core';

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
        kind: 'boolean',
        brief: 'Disable prompts and enable optional setup only through explicit flags',
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
      'Probes OPA and Regal, previews one safe transactional plan, and creates a publishable fail-closed Rego v1 starter only in an empty target. Optional editor, Agent Skill, and validation-only CI setup preserve repository customization. No Transcend credentials are needed.',
  },
});
