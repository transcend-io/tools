import { RequestAction, RequestDataSiloStatus, RequestStatus } from '@transcend-io/privacy-types';

import { buildExamples } from '../../../../lib/docgen/buildExamples.js';
import type { SkipRequestDataSilosCommandFlags } from './impl.js';

const examples = buildExamples<SkipRequestDataSilosCommandFlags>(
  ['request', 'system', 'skip-request-data-silos'],
  [
    {
      description: 'Bulk skipping all open privacy request jobs for a particular data silo',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        statuses: [RequestStatus.Compiling, RequestStatus.Secondary],
      },
    },
    {
      description: 'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        transcendUrl: 'https://api.us.transcend.io',
        statuses: [RequestStatus.Compiling, RequestStatus.Secondary],
      },
    },
    {
      description: 'Only mark as completed requests in "removing data" phase',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        statuses: [RequestStatus.Secondary],
      },
    },
    {
      description: 'Set to status "RESOLVED" instead of status "SKIPPED"',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        statuses: [RequestStatus.Compiling, RequestStatus.Secondary],
        status: RequestDataSiloStatus.Resolved,
      },
    },
    {
      description: 'Only skip jobs for specific request actions (e.g. opt-out and opt-in)',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        dataSiloId: '70810f2e-cf90-43f6-9776-901a5950599f',
        statuses: [RequestStatus.Compiling, RequestStatus.Secondary],
        actions: [RequestAction.ContactOptOut, RequestAction.ContactOptIn],
      },
    },
  ],
);

export default `#### Examples

${examples}`;
