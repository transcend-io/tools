import { buildCommand } from '@stricli/core';
import {
  RequestAction,
  RequestDataSiloStatus,
  RequestStatus,
  ScopeName,
} from '@transcend-io/privacy-types';

import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../../lib/cli/common-parameters.js';
import { uuidParser } from '../../../../lib/cli/parsers.js';

export const skipRequestDataSilosCommand = buildCommand({
  loader: async () => {
    const { skipRequestDataSilos } = await import('./impl.js');
    return skipRequestDataSilos;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ManageRequestCompilation],
      }),
      dataSiloId: {
        kind: 'parsed',
        parse: uuidParser,
        brief: 'The ID of the data silo to skip privacy request jobs for',
      },
      transcendUrl: createTranscendUrlParameter(),
      statuses: {
        kind: 'enum',
        values: Object.values(RequestStatus),
        variadic: ',',
        brief: 'The request statuses to skip',
      },
      status: {
        kind: 'enum',
        values: [RequestDataSiloStatus.Skipped, RequestDataSiloStatus.Resolved],
        brief: 'The status to set the request data silo job to',
        default: RequestDataSiloStatus.Skipped,
      },
      actionTypes: {
        kind: 'enum',
        values: Object.values(RequestAction),
        variadic: ',',
        brief:
          'Filter by request action types (e.g. ACCESS,ERASURE). ' +
          'Only request data silo jobs for these action types will be skipped.',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Skip request data silos',
    fullDescription:
      'This command allows for bulk skipping all open privacy request jobs for a particular data silo. ' +
      'This command is useful if you want to disable a data silo and then clear out any active privacy ' +
      'requests that are still queued up for that data silo. ' +
      'Use --actionTypes to target specific data actions (e.g. only ERASURE jobs).',
  },
});
