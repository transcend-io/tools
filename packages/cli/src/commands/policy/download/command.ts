import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';

import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters.js';

export const downloadCommand = buildCommand({
  loader: async () => {
    const { download } = await import('./impl.js');
    return download;
  },
  parameters: {
    flags: {
      'bundle-name': {
        kind: 'parsed',
        parse: String,
        brief: 'Tenant-unique policy bundle name',
      },
      version: {
        kind: 'parsed',
        parse: String,
        brief: 'Caller-supplied version label to download',
      },
      output: {
        kind: 'parsed',
        parse: String,
        brief:
          'Destination file path for the compiled .tar.gz bundle (defaults to {bundleName}-{version}.tar.gz)',
        optional: true,
      },
      auth: createAuthParameter({
        scopes: [ScopeName.ViewPolicyEngineBundles],
      }),
      'transcend-url': createTranscendUrlParameter(),
      json: {
        kind: 'boolean',
        brief:
          'Print version metadata and the presigned download URL as JSON without writing a file',
        default: false,
      },
    },
  },
  docs: {
    brief: 'Download a compiled policy bundle version',
    fullDescription:
      'Resolves a bundle name and version label, fetches a short-lived presigned URL from the ' +
      'Policy Engine API, and downloads the compiled OPA bundle tarball (.tar.gz) to disk. ' +
      'With --json, prints metadata and the presigned URL without writing a file. ' +
      'Requires a Transcend API key with View Policy scope.',
  },
});
