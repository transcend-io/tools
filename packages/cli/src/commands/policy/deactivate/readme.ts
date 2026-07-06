import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';

import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { DeactivateCommandFlags } from './impl.js';

const examples = buildExamples<DeactivateCommandFlags>(
  ['policy', 'deactivate'],
  [
    {
      description: 'Deactivate the active version of a bundle by name',
      flags: {
        bundleName: 'main',
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Print the raw JSON response',
      flags: {
        bundleName: 'main',
        auth: '$TRANSCEND_API_KEY',
        json: true,
      },
    },
    {
      description: 'Omit --auth by exporting TRANSCEND_API_KEY in the environment',
      flags: {
        bundleName: 'main',
      },
    },
  ],
);

export default `#### Examples

${examples}

Requires the **${TRANSCEND_SCOPES[ScopeName.ActivatePolicyEngineBundles].title}** scope on your API key.
`;
