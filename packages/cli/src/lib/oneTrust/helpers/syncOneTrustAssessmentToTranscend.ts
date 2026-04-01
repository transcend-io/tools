import { OneTrustEnrichedAssessment } from '@transcend-io/privacy-types';
import { makeGraphQLRequest, IMPORT_ONE_TRUST_ASSESSMENT_FORMS } from '@transcend-io/sdk';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';

import { ImportOnetrustAssessmentsInput } from '../../../codecs.js';
import { logger } from '../../../logger.js';
import { oneTrustAssessmentToJson } from './oneTrustAssessmentToJson.js';

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
 */
export const syncOneTrustAssessmentToTranscend = async ({
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
}): Promise<void> => {
  logger.info(
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
      logger,
    });
  } catch (error) {
    logger.error(
      colors.red(
        `Failed to sync assessment ${index + 1} ${total ? `of ${total} ` : ' '}to Transcend.\n` +
          `\tAssessment Title: ${assessment.name}. Template Title: ${assessment.template.name}\n`,
      ),
      error,
    );
  }
};
