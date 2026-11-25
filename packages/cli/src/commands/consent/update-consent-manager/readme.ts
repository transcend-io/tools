import { ConsentBundleType, ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';

import { buildExamples, buildExampleCommand } from '../../../lib/docgen/buildExamples.js';
import type { GenerateApiKeysCommandFlags } from '../../admin/generate-api-keys/impl.js';
import type { UpdateConsentManagerCommandFlags } from './impl.js';

const examples = buildExamples<UpdateConsentManagerCommandFlags>(
  ['consent', 'update-consent-manager'],
  [
    {
      description: 'Update Consent Manager to latest version',
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
      description: 'Update version and deploy bundles',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        deploy: true,
      },
    },
    {
      description: 'Update just the TEST bundle',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        bundleTypes: [ConsentBundleType.Test],
      },
    },
    {
      description: 'Update just the PRODUCTION bundle',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        bundleTypes: [ConsentBundleType.Production],
      },
    },
  ],
);

export default `#### Deploy after a consent as code push

Run this command after [\`transcend inventory push\`](#transcend-inventory-push) to publish your saved consent manager settings. A push alone does not publish them.

This command always updates airgap.js to the latest version for each bundle type, then deploys when you pass \`--deploy\`. It runs even if your \`transcend.yml\` sets a \`version\`. To deploy without changing the airgap.js version, use \`transcend consent deploy\`. Use \`--bundleTypes=TEST\` to check a new version before you touch \`PRODUCTION\`.

#### Examples

${examples}

**Update multiple organizations at once**

\`\`\`sh
${buildExampleCommand<GenerateApiKeysCommandFlags>(['admin', 'generate-api-keys'], {
  email: 'test@transcend.io',
  password: '$TRANSCEND_PASSWORD',
  scopes: [TRANSCEND_SCOPES[ScopeName.ManageConsentManager].title],
  apiKeyTitle: 'CLI Usage Cross Instance Sync',
  file: './transcend-api-keys.json',
})}
${buildExampleCommand<UpdateConsentManagerCommandFlags>(['consent', 'update-consent-manager'], {
  auth: './transcend-api-keys.json',
  deploy: true,
})}
\`\`\``;
