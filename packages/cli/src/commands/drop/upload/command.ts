import { buildCommand, numberParser } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';

import {
  createAuthParameter,
  createSombraAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters.js';

export const uploadCommand = buildCommand({
  loader: async () => {
    const { upload } = await import('./impl.js');
    return upload;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.MakeDataSubjectRequest],
      }),
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to the DROP File 2 CSV of matched records to upload',
        default: './file2.csv',
      },
      dropRunId: {
        kind: 'parsed',
        parse: String,
        brief:
          'The DROP run id these matched records belong to (find it via `GET /drop/api/v1/runs` or the DROP dashboard). Every created DSR is anchored to this run for report-back.',
      },
      transcendUrl: createTranscendUrlParameter(),
      sombraAuth: createSombraAuthParameter(),
      batchSize: {
        kind: 'parsed',
        parse: numberParser,
        brief: 'Number of grouped DSRs to submit per bulk request',
        default: '100',
      },
      dryRun: {
        kind: 'boolean',
        brief:
          'When true, parse and group File 2 and print what would be submitted, without calling the API',
        default: false,
      },
    },
  },
  docs: {
    brief: 'Upload a DROP File 2 of matched records as erasure DSRs',
    fullDescription: `Upload a California DROP File 2 (matched records) as erasure DSRs against a DROP run.

File 2 has one row per matched (drop_record_id, drop_list_type). Rows sharing a person_key are collapsed into a single erasure request that carries all of that person's DROP record ids, so one person produces one workflow run (never one per matched record). Each request is anchored to --dropRunId so Transcend can report the resolution of every record back to CalPrivacy.

status_override rows (records that report a CPPA status directly without a deletion) are skipped by this command and should be reconciled in the DROP dashboard.`,
  },
});
