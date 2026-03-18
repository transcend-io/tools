import colors from 'colors';
import * as t from 'io-ts';

import type { LocalContext } from '../../../../context.js';
import { doneInputValidation } from '../../../../lib/cli/done-input-validation.js';
import { markRequestDataSiloIdsCompleted } from '../../../../lib/cron/index.js';
import { readCsv } from '../../../../lib/requests/index.js';
import { logger } from '../../../../logger.js';

const RequestIdRow = t.type({
  'Request Id': t.string,
});

export interface MarkRequestDataSilosCompletedCommandFlags {
  auth: string;
  dataSiloId: string;
  file: string;
  transcendUrl: string;
}

export async function markRequestDataSilosCompleted(
  this: LocalContext,
  { auth, dataSiloId, file, transcendUrl }: MarkRequestDataSilosCompletedCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  logger.info(colors.magenta(`Reading "${file}" from disk`));
  const activeResults = readCsv(file, RequestIdRow);

  await markRequestDataSiloIdsCompleted({
    requestIds: activeResults.map((request) => request['Request Id']),
    transcendUrl,
    auth,
    dataSiloId,
  });
}
