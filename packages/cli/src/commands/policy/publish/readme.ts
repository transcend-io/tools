import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';

import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import { PERMISSIONS_POLICY_BUNDLE_NAME } from '../../../lib/policy/policy-scaffold-templates.js';
import type { PublishCommandFlags } from './impl.js';

const examples = buildExamples<PublishCommandFlags>(
  ['policy', 'publish'],
  [
    {
      description: 'Publish a local policy bundle as the main bundle',
      positionals: ['transcend/policy/example-bundle'],
      flags: {
        'bundle-name': 'main',
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Publish with an explicit version label and description',
      positionals: ['transcend/policy/example-bundle'],
      flags: {
        'bundle-name': 'main',
        auth: '$TRANSCEND_API_KEY',
        version: '2026-06-25',
        description: 'Quarterly policy update',
      },
    },
    {
      description: 'Publish to the US-hosted Transcend API',
      positionals: ['transcend/policy/example-bundle'],
      flags: {
        'bundle-name': 'common',
        auth: '$TRANSCEND_API_KEY',
        'transcend-url': 'https://api.us.transcend.io',
      },
    },
    {
      description: 'Publish the Permissions API bundle (fixed remote name)',
      positionals: ['transcend/policy/permissions-bundle'],
      flags: {
        'bundle-name': PERMISSIONS_POLICY_BUNDLE_NAME,
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Omit --auth by exporting TRANSCEND_API_KEY in the environment',
      positionals: ['transcend/policy/example-bundle'],
      flags: {
        'bundle-name': 'main',
      },
    },
  ],
);

export default `#### Examples

${examples}

\`--bundle-name\` is the remote Policy Engine name (not the local folder). The \`<bundle>\`
positional is the local publish directory containing a \`.manifest\`.

Requires the **${TRANSCEND_SCOPES[ScopeName.ManagePolicyEngineBundles].title}** scope on your API key.
`;
