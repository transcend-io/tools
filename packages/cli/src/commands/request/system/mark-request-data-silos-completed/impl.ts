import colors from 'colors';
import * as t from 'io-ts';

import type { LocalContext } from '../../../../context.js';
import { doneInputValidation } from '../../../../lib/cli/done-input-validation.js';
import { markRequestDataSiloIdsCompleted } from '../../../../lib/cron/index.js';
import { parseCsv } from '../../../../lib/requests/readCsv.js';

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
  doneInputValidation(this.process);

  this.logger.info(colors.magenta(`Reading "${file}" from disk`));
  const activeResults = parseCsv(this.fs.readFileSync(file, 'utf8'), RequestIdRow);

  await markRequestDataSiloIdsCompleted({
    requestIds: activeResults.map((request) => request['Request Id']),
    transcendUrl,
    auth,
    dataSiloId,
  });
}
