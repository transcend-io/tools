import { RequestStatus } from '@transcend-io/privacy-types';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { downloadPrivacyRequestFiles } from '../../../lib/requests/index.js';

export interface DownloadFilesCommandFlags {
  auth: string;
  sombraAuth?: string;
  concurrency: number;
  requestIds?: string[];
  statuses?: RequestStatus[];
  folderPath: string;
  createdAtBefore?: Date;
  createdAtAfter?: Date;
  updatedAtBefore?: Date;
  updatedAtAfter?: Date;
  approveAfterDownload: boolean;
  transcendUrl: string;
}

export async function downloadFiles(
  this: LocalContext,
  {
    auth,
    transcendUrl,
    folderPath,
    requestIds,
    statuses = [RequestStatus.Approving, RequestStatus.Downloadable],
    concurrency,
    createdAtBefore,
    createdAtAfter,
    updatedAtBefore,
    updatedAtAfter,
    approveAfterDownload,
  }: DownloadFilesCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  await downloadPrivacyRequestFiles({
    transcendUrl,
    auth,
    folderPath,
    requestIds,
    statuses,
    concurrency,
    createdAtBefore,
    createdAtAfter,
    updatedAtBefore,
    updatedAtAfter,
    approveAfterDownload,
  });
}
