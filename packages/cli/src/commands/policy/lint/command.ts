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
    brief: 'Lint and format-check a local policy bundle',
    fullDescription:
      'Runs `opa check --strict` and `opa fmt --diff` against a local policy directory. ' +
      'Requires the `opa` CLI on PATH. No Transcend API key is needed.',
  },
});
