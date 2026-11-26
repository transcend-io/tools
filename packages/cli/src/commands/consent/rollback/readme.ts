import { ConsentBundleType } from '@transcend-io/privacy-types';

import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { RollbackCommandFlags } from './impl.js';

const examples = buildExamples<RollbackCommandFlags>(
  ['consent', 'rollback'],
  [
    {
      description: 'Roll the TEST bundle back to an earlier airgap.js version',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        bundleTypes: [ConsentBundleType.Test],
        version: '1.2.3',
      },
    },
    {
      description: 'Check what a PRODUCTION rollback would do without changing anything',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        bundleTypes: [ConsentBundleType.Production],
        version: '1.2.3',
        dryRun: true,
      },
    },
    {
      description: 'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        bundleTypes: [ConsentBundleType.Test, ConsentBundleType.Production],
        version: '1.2.3',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
  ],
);

export default `#### Examples

${examples}`;
