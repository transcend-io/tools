import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';

import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters.js';

export const publishCommand = buildCommand({
  loader: async () => {
    const { publish } = await import('./impl.js');
    return publish;
  },
  parameters: {
    flags: {
      dir: {
        kind: 'parsed',
        parse: String,
        brief: 'Directory containing Rego policy files (and optional data.json)',
      },
      bundleName: {
        kind: 'parsed',
        parse: String,
        brief: 'Tenant-unique policy bundle name',
      },
      auth: createAuthParameter({
        scopes: [ScopeName.ManagePolicyEngineBundles],
      }),
      transcendUrl: createTranscendUrlParameter(),
      version: {
        kind: 'parsed',
        parse: String,
        brief: 'Version label (defaults to git SHA or timestamp)',
        optional: true,
      },
      description: {
        kind: 'parsed',
        parse: String,
        brief: 'Optional description for the uploaded version',
        optional: true,
      },
      json: {
        kind: 'boolean',
        brief: 'Print the raw JSON API response',
        default: false,
      },
    },
  },
  docs: {
    brief: 'Build and upload a new policy bundle version',
    fullDescription:
      'Compiles a local directory of Rego policy files into an OPA bundle with `opa build` and uploads it to Transcend. ' +
      'Creates the bundle on first upload, then appends immutable versions. ' +
      'Requires the `opa` CLI on PATH and a Transcend API key with Manage Policy scope.',
  },
});
