import fs from 'node:fs';

import { OneTrustEnrichedAssessment } from '@transcend-io/privacy-types';
import { decodeCodec } from '@transcend-io/type-utils';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import JSONStream from 'JSONStream';

import type { CliLogger } from '../../../context.js';
import { syncOneTrustAssessmentToTranscend } from './syncOneTrustAssessmentToTranscend.js';

/** Runtime dependencies used to sync OneTrust assessments from a file. */
export interface SyncOneTrustAssessmentsFromFileDependencies {
  /** Filesystem operations used to stream the source file. */
  readonly fs: Pick<typeof fs, 'createReadStream'>;
  /** Logger used to report sync progress and failures. */
  readonly logger: Pick<CliLogger, 'debug' | 'error' | 'info' | 'warn'>;
}

const defaultDependencies: SyncOneTrustAssessmentsFromFileDependencies = {
  fs,
  logger: console,
};

/**
 * Reads assessments from a file and syncs them to Transcend.
 *
 * @param param - the information about the source file and Transcend instance to write them to.
 * @param dependencies - Runtime operations used while syncing the assessments.
 */
export const syncOneTrustAssessmentsFromFile = (
  {
    transcend,
    file,
  }: {
    /** the Transcend client instance */
    transcend: GraphQLClient;
    /** The name of the file from which to read the OneTrust assessments */
    file: string;
  },
  dependencies: SyncOneTrustAssessmentsFromFileDependencies = defaultDependencies,
): Promise<void> => {
  dependencies.logger.info(`Getting list of all assessments from file ${file}...`);

  return new Promise((resolve, reject) => {
    // Create a readable stream from the file
    const fileStream = dependencies.fs.createReadStream(file, {
      encoding: 'utf-8',
      highWaterMark: 64 * 1024, // 64KB chunks
    });

    // Create a JSONStream parser to parse the array of OneTrust assessments from the file
    const parser = JSONStream.parse('*'); // '*' matches each element in the root array

    let index = 0;

    // Pipe the file stream into the JSON parser
    fileStream.pipe(parser);

    // Handle each parsed assessment object
    parser.on('data', async (assessment) => {
      try {
        // Pause the stream while processing to avoid overwhelming memory
        parser.pause();

        // Decode and validate the assessment
        const parsedAssessment = decodeCodec(OneTrustEnrichedAssessment, assessment);

        // Sync the assessment to transcend
        await syncOneTrustAssessmentToTranscend(
          {
            assessment: parsedAssessment,
            transcend,
            index,
          },
          {
            logger: dependencies.logger,
          },
        );

        index += 1;

        // Resume the stream after processing
        parser.resume();
      } catch (e) {
        // if failed to parse a line, report error and continue
        dependencies.logger.error(
          colors.red(`Failed to parse the assessment ${index} from file '${file}': ${e.message}.`),
        );
      }
    });

    // Handle completion
    parser.on('end', () => {
      dependencies.logger.info(`Finished processing ${index} assessments from file ${file}`);
      resolve();
    });

    // Handle stream or parsing errors
    parser.on('error', (error) => {
      dependencies.logger.error(colors.red(`Error parsing file '${file}': ${error.message}`));
      reject(error);
    });

    fileStream.on('error', (error) => {
      dependencies.logger.error(colors.red(`Error reading file '${file}': ${error.message}`));
      reject(error);
    });
  });
};
