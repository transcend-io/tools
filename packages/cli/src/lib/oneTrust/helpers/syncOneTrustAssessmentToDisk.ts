import fs from 'node:fs';

import { OneTrustEnrichedAssessment } from '@transcend-io/privacy-types';
import colors from 'colors';

import type { CliLogger } from '../../../context.js';
import { oneTrustAssessmentToJson } from './oneTrustAssessmentToJson.js';

/** Runtime dependencies used to write a OneTrust assessment to disk. */
export interface SyncOneTrustAssessmentToDiskDependencies {
  /** Filesystem operations used to update the destination file. */
  readonly fs: Pick<typeof fs, 'appendFileSync' | 'writeFileSync'>;
  /** Logger used to report write progress. */
  readonly logger: Pick<CliLogger, 'info'>;
}

const defaultDependencies: SyncOneTrustAssessmentToDiskDependencies = {
  fs,
  logger: console,
};

/**
 * Write the assessment to disk at the specified file path.
 *
 *
 * @param param - information about the assessment to write
 * @param dependencies - Runtime operations used while writing the assessment.
 */
export const syncOneTrustAssessmentToDisk = (
  {
    file,
    assessment,
    index,
    total,
  }: {
    /** The file path to write the assessment to */
    file: string;
    /** The basic assessment */
    assessment: OneTrustEnrichedAssessment;
    /** The index of the assessment being written to the file */
    index: number;
    /** The total amount of assessments that we will write */
    total: number;
  },
  dependencies: SyncOneTrustAssessmentToDiskDependencies = defaultDependencies,
): void => {
  dependencies.logger.info(
    colors.magenta(`Writing enriched assessment ${index + 1} of ${total} to file "${file}"...`),
  );

  if (index === 0) {
    dependencies.fs.writeFileSync(
      file,
      oneTrustAssessmentToJson({
        assessment,
        index,
        total,
        wrap: false,
      }),
    );
  } else {
    dependencies.fs.appendFileSync(
      file,
      oneTrustAssessmentToJson({
        assessment,
        index,
        total,
        wrap: false,
      }),
    );
  }
};
