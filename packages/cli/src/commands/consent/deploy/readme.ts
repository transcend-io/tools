import { ConsentBundleType, ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';

import { buildExamples, buildExampleCommand } from '../../../lib/docgen/buildExamples.js';
import type { GenerateApiKeysCommandFlags } from '../../admin/generate-api-keys/impl.js';
import type { DeployCommandFlags } from './impl.js';

const examples = buildExamples<DeployCommandFlags>(
  ['consent', 'deploy'],
  [
    {
      description: 'Deploy the TEST and PRODUCTION bundles without changing the airgap.js version',
      flags: {
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
    {
      description: 'Deploy just the TEST bundle',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        bundleTypes: [ConsentBundleType.Test],
      },
    },
    {
      description: 'Abort if the API key belongs to a different Consent Manager than expected',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        expectBundleId: '$EXPECTED_CONSENT_MANAGER_ID',
      },
    },
    {
      description: 'Wait for each deploy to finish and fail if it ends in an error',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        wait: true,
        waitTimeoutSeconds: 300,
      },
    },
  ],
);

export default `#### Examples

${examples}

**Deploy multiple organizations at once**

\`\`\`sh
${buildExampleCommand<GenerateApiKeysCommandFlags>(['admin', 'generate-api-keys'], {
  email: 'test@example.com',
  password: '$TRANSCEND_PASSWORD',
  scopes: [TRANSCEND_SCOPES[ScopeName.ManageConsentManager].title],
  apiKeyTitle: 'CLI Usage Cross Instance Sync',
  file: './transcend-api-keys.json',
})}
${buildExampleCommand<DeployCommandFlags>(['consent', 'deploy'], {
  auth: './transcend-api-keys.json',
})}
\`\`\``;
