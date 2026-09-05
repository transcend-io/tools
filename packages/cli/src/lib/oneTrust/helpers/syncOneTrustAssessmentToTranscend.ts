import { OneTrustEnrichedAssessment } from '@transcend-io/privacy-types';
import { makeGraphQLRequest, IMPORT_ONE_TRUST_ASSESSMENT_FORMS } from '@transcend-io/sdk';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';

import { ImportOnetrustAssessmentsInput } from '../../../codecs.js';
import type { CliLogger } from '../../../context.js';
import { oneTrustAssessmentToJson } from './oneTrustAssessmentToJson.js';

/** Runtime dependencies used to sync a OneTrust assessment to Transcend. */
export interface SyncOneTrustAssessmentToTranscendDependencies {
  /** Logger used to report sync progress and failures. */
  readonly logger: Pick<CliLogger, 'debug' | 'error' | 'info' | 'warn'>;
}

const defaultDependencies: SyncOneTrustAssessmentToTranscendDependencies = {
  logger: console,
};

export interface AssessmentForm {
  /** ID of Assessment Form */
  id: string;
  /** Title of Assessment Form */
  name: string;
}

/**
 * Write the assessment to a Transcend instance.
 *
 *
 * @param param - information about the assessment and Transcend instance to write to
 * @param dependencies - Runtime operations used while syncing the assessment.
 */
export const syncOneTrustAssessmentToTranscend = async (
  {
    transcend,
    assessment,
    total,
    index,
  }: {
    /** the Transcend client instance */
    transcend: GraphQLClient;
    /** the assessment to sync to Transcend */
    assessment: OneTrustEnrichedAssessment;
    /** The index of the assessment being written to the file */
    index: number;
    /** The total amount of assessments that we will write */
    total?: number;
  },
  dependencies: SyncOneTrustAssessmentToTranscendDependencies = defaultDependencies,
): Promise<void> => {
  dependencies.logger.info(
    colors.magenta(
      `Writing enriched assessment ${index + 1} ${total ? `of ${total} ` : ' '}to Transcend...`,
    ),
  );

  // convert the OneTrust assessment object into a json record
  const json = oneTrustAssessmentToJson({
    assessment,
    index,
    total,
  });

  // transform the json record into a valid input to the mutation
  const input: ImportOnetrustAssessmentsInput = {
    json,
  };

  try {
    await makeGraphQLRequest<{
      /** the importOneTrustAssessmentForms mutation */
      importOneTrustAssessmentForms: {
        /** Created Assessment Forms */
        assessmentForms: AssessmentForm[];
      };
    }>(transcend, IMPORT_ONE_TRUST_ASSESSMENT_FORMS, {
      variables: { input },
      logger: dependencies.logger,
    });
  } catch (error) {
    dependencies.logger.error(
      colors.red(
        `Failed to sync assessment ${index + 1} ${total ? `of ${total} ` : ' '}to Transcend.\n` +
          `\tAssessment Title: ${assessment.name}. Template Title: ${assessment.template.name}\n`,
      ),
      error,
    );
  }
};
