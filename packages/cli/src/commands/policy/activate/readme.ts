import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';

import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { ActivateCommandFlags } from './impl.js';

const examples = buildExamples<ActivateCommandFlags>(
  ['policy', 'activate'],
  [
    {
      description: 'Activate a uploaded policy bundle version by bundle name',
      flags: {
        versionId: '7098bb38-070d-4f26-8fa4-1b61b9cdef77',
        bundleName: 'main',
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Activate using explicit parent bundle and version UUIDs',
      flags: {
        versionId: '7098bb38-070d-4f26-8fa4-1b61b9cdef77',
        policyBundleId: '6a3218db-5703-44eb-8d01-e3ea57ab8e49',
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Validate activation without flipping the active version',
      flags: {
        versionId: '7098bb38-070d-4f26-8fa4-1b61b9cdef77',
        bundleName: 'main',
        auth: '$TRANSCEND_API_KEY',
        dryRun: true,
      },
    },
    {
      description: 'Omit --auth by exporting TRANSCEND_API_KEY in the environment',
      flags: {
        versionId: '7098bb38-070d-4f26-8fa4-1b61b9cdef77',
        bundleName: 'main',
      },
    },
  ],
);

export default `#### Examples

${examples}

Requires the **${TRANSCEND_SCOPES[ScopeName.ActivatePolicyEngineBundles].title}** scope on your API key.
`;
