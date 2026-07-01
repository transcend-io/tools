import { buildCommand } from '@stricli/core';

export const lintCommand = buildCommand({
  loader: async () => {
    const { lint } = await import('./impl.js');
    return lint;
  },
  parameters: {
    flags: {
      dir: {
        kind: 'parsed',
        parse: String,
        brief: 'Directory containing Rego policy files',
      },
    },
  },
  docs: {
    brief: 'Lint and optionally format a local policy bundle',
    fullDescription:
      'Runs `opa check --strict` for Rego validation and `opa fmt` for formatting. ' +
      'When files are not formatted, lists the affected paths, prints a diff, and prompts to format them in place. ' +
      'Requires the `opa` CLI on PATH. No Transcend API key is needed.',
  },
});
