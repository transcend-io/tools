import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';

import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { PublishCommandFlags } from './impl.js';

const examples = buildExamples<PublishCommandFlags>(
  ['policy', 'publish'],
  [
    {
      description: 'Publish the default local policy project as the main bundle',
      flags: {
        'bundle-name': 'main',
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Publish with an explicit version label and description',
      flags: {
        'bundle-name': 'main',
        auth: '$TRANSCEND_API_KEY',
        version: '2026-06-25',
        description: 'Quarterly policy update',
      },
    },
    {
      description: 'Publish to the US-hosted Transcend API',
      flags: {
        'bundle-name': 'common',
        auth: '$TRANSCEND_API_KEY',
        'transcend-url': 'https://api.us.transcend.io',
      },
    },
    {
      description: 'Omit --auth by exporting TRANSCEND_API_KEY in the environment',
      flags: {
        'bundle-name': 'main',
      },
    },
  ],
);

export default `#### Examples

${examples}

Pass another policy project directory positionally:

\`\`\`sh
transcend policy publish ./policies --bundle-name=main --auth="$TRANSCEND_API_KEY"
\`\`\`

Requires the **${TRANSCEND_SCOPES[ScopeName.ManagePolicyEngineBundles].title}** scope on your API key.
`;
