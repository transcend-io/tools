import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';

import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { DownloadCommandFlags } from './impl.js';

const examples = buildExamples<DownloadCommandFlags>(
  ['policy', 'download'],
  [
    {
      description: 'Download a compiled policy bundle version to the default path',
      flags: {
        'bundle-name': 'main',
        version: '2026-06-25',
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Download to an explicit output path',
      flags: {
        'bundle-name': 'main',
        version: '2026-06-25',
        auth: '$TRANSCEND_API_KEY',
        output: './bundles/main-2026-06-25.tar.gz',
      },
    },
    {
      description: 'Print version metadata and the presigned URL as JSON without writing a file',
      flags: {
        'bundle-name': 'main',
        version: '2026-06-25',
        auth: '$TRANSCEND_API_KEY',
        json: true,
      },
    },
    {
      description: 'Omit --auth by exporting TRANSCEND_API_KEY in the environment',
      flags: {
        'bundle-name': 'main',
        version: '2026-06-25',
      },
    },
  ],
);

export default `#### Examples

${examples}

Requires the **${TRANSCEND_SCOPES[ScopeName.ViewPolicyEngineBundles].title}** scope on your API key.

The downloaded artifact is a compiled OPA bundle tarball (\`.tar.gz\`), not a \`.zip\`.
`;
