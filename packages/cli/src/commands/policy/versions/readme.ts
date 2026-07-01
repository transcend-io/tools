import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';

import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { VersionsCommandFlags } from './impl.js';

const examples = buildExamples<VersionsCommandFlags>(
  ['policy', 'versions'],
  [
    {
      description: 'List versions for a policy bundle',
      flags: {
        bundleName: 'main',
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Fetch the next page of versions using an after cursor',
      flags: {
        bundleName: 'main',
        auth: '$TRANSCEND_API_KEY',
        after: '$POLICY_VERSION_CURSOR',
      },
    },
  ],
);

export default `#### Examples

${examples}

Requires the **${TRANSCEND_SCOPES[ScopeName.ViewPolicyEngineBundles].title}** scope on your API key.
`;
