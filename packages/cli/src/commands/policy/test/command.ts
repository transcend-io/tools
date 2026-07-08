import { buildCommand } from '@stricli/core';

export const testCommand = buildCommand({
  loader: async () => {
    const { test } = await import('./impl.js');
    return test;
  },
  parameters: {
    flags: {
      dir: {
        kind: 'parsed',
        parse: String,
        brief: 'Directory containing Rego policy files and tests',
      },
    },
  },
  docs: {
    brief: 'Run OPA tests against a local policy bundle',
    fullDescription:
      'Wraps `opa test` for a local policy directory. Requires the `opa` CLI on PATH. ' +
      'No Transcend API key is needed.',
  },
});
