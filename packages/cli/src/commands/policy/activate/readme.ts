import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';

import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { ActivateCommandFlags } from './impl.js';

const examples = buildExamples<ActivateCommandFlags>(
  ['policy', 'activate'],
  [
    {
      description: 'Activate the latest uploaded version for a bundle',
      flags: {
        'bundle-name': 'main',
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Activate a specific version label by bundle name',
      flags: {
        version: 'abc123',
        'bundle-name': 'main',
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Activate using explicit parent bundle UUID',
      flags: {
        version: 'abc123',
        'policy-bundle-id': '6a3218db-5703-44eb-8d01-e3ea57ab8e49',
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Validate activation without flipping the active version',
      flags: {
        version: 'abc123',
        'bundle-name': 'main',
        auth: '$TRANSCEND_API_KEY',
        'dry-run': true,
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

Requires the **${TRANSCEND_SCOPES[ScopeName.ActivatePolicyEngineBundles].title}** scope on your API key.
`;
