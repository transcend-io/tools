import { buildCommand } from '@stricli/core';

export const evalCommand = buildCommand({
  loader: async () => {
    const { _eval } = await import('./impl.js');
    return _eval;
  },
  parameters: {
    flags: {
      pkg: {
        kind: 'parsed',
        parse: String,
        brief: 'OPA package or query to evaluate (e.g. data.transcend.decision)',
      },
      input: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to a JSON envelope input file',
      },
      bundle: {
        kind: 'parsed',
        parse: String,
        brief: 'Optional local policy bundle directory',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Evaluate one envelope against a local policy bundle',
    fullDescription:
      'Wraps `opa eval` for local policy debugging. Requires the `opa` CLI on PATH. ' +
      'No Transcend API key is needed.',
  },
});
