import { ConsentBundleType } from '@transcend-io/privacy-types';

import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { PreviewDeployCommandFlags } from './impl.js';

const examples = buildExamples<PreviewDeployCommandFlags>(
  ['consent', 'preview-deploy'],
  [
    {
      description: 'Preview the TEST and PRODUCTION deploys',
      flags: {
        auth: '$TRANSCEND_API_KEY',
      },
    },
    {
      description: 'Preview only the PRODUCTION deploy',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        bundleTypes: [ConsentBundleType.Production],
      },
    },
    {
      description: 'Print the result as JSON',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        json: true,
      },
    },
    {
      description: 'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
  ],
);

export default `#### Examples

${examples}`;
