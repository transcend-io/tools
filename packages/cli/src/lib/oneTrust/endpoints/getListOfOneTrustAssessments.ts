import {
  OneTrustAssessment,
  OneTrustGetListOfAssessmentsResponse,
} from '@transcend-io/privacy-types';
import { decodeCodec } from '@transcend-io/type-utils';
import { Got } from 'got';

import type { CliLogger } from '../../../context.js';

/** Runtime dependencies used to list OneTrust assessments. */
export interface GetListOfOneTrustAssessmentsDependencies {
  /** Logger used to report pagination progress. */
  readonly logger: Pick<CliLogger, 'info'>;
}

const defaultDependencies: GetListOfOneTrustAssessmentsDependencies = {
  logger: console,
};

/**
 * Fetch a list of all assessments from the OneTrust client.
 * ref: https://developer.onetrust.com/onetrust/reference/getallassessmentbasicdetailsusingget
 *
 * @param param - the information about the OneTrust client
 * @param dependencies - Runtime operations used while listing assessments.
 * @returns a list of OneTrustAssessment
 */
export const getListOfOneTrustAssessments = async (
  {
    oneTrust,
  }: {
    /** The OneTrust client instance */
    oneTrust: Got;
  },
  dependencies: GetListOfOneTrustAssessmentsDependencies = defaultDependencies,
): Promise<OneTrustAssessment[]> => {
  let currentPage = 0;
  let totalPages = 1;
  let totalElements = 0;

  const allAssessments: OneTrustAssessment[] = [];

  while (currentPage < totalPages) {
    const { body } = await oneTrust.get(
      `api/assessment/v2/assessments?page=${currentPage}&size=2000`,
    );

    const { page, content } = decodeCodec(OneTrustGetListOfAssessmentsResponse, body);
    allAssessments.push(...(content ?? []));
    if (currentPage === 0) {
      totalPages = page?.totalPages ?? 0;
      totalElements = page?.totalElements ?? 0;
    }
    currentPage += 1;

    // log progress
    dependencies.logger.info(`Fetched ${allAssessments.length} of ${totalElements} assessments.`);
  }

  return allAssessments;
};
