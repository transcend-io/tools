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
        brief: 'Directory containing the local policy project',
        default: 'transcend/policy',
      },
      fix: {
        kind: 'boolean',
        brief: 'Apply OPA formatting without running broad Regal fixes',
        default: false,
      },
      noInteractive: {
        kind: 'boolean',
        brief: 'Disable the optional formatting confirmation',
        default: false,
      },
      json: {
        kind: 'boolean',
        brief: 'Emit one stable JSON result and imply non-interactive behavior',
        default: false,
      },
    },
  },
  docs: {
    brief: 'Verify a local policy project with OPA and Regal',
    fullDescription:
      'Validates manifest roots and package coverage, verifies OPA 1.x and Regal, checks or repairs OPA formatting, ' +
      'runs a production-only strict OPA check, treats Regal warnings as failures, and requires non-empty OPA tests. ' +
      'No Transcend API key is needed.',
  },
});
