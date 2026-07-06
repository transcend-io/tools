import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';

import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { VersionsCommandFlags } from './impl.js';

const examples = buildExamples<VersionsCommandFlags>(
  ['policy', 'versions'],
  [
    {
      description: 'List versions for a policy bundle',
      flags: {
        'bundle-name': 'main',
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Fetch the next page of versions using an after cursor',
      flags: {
        'bundle-name': 'main',
        auth: '$TRANSCEND_API_KEY',
        after: '$POLICY_VERSION_CURSOR',
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

Requires the **${TRANSCEND_SCOPES[ScopeName.ViewPolicyEngineBundles].title}** scope on your API key.
`;
