import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';

import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { BundlesCommandFlags } from './impl.js';

const examples = buildExamples<BundlesCommandFlags>(
  ['policy', 'bundles'],
  [
    {
      description: 'List policy bundles for the current organization',
      flags: {
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Fetch the next page using offset pagination',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        offset: 50,
      },
    },
    {
      description: 'Omit --auth by exporting TRANSCEND_API_KEY in the environment',
      flags: {},
    },
  ],
);

export default `#### Examples

${examples}

Requires the **${TRANSCEND_SCOPES[ScopeName.ViewPolicyEngineBundles].title}** scope on your API key.
`;
