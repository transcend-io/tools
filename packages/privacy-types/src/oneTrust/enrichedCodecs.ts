import * as t from 'io-ts';

import {
  OneTrustApprover,
  OneTrustAssessment,
  OneTrustAssessmentQuestion,
  OneTrustAssessmentQuestionRisk,
  OneTrustAssessmentSection,
  OneTrustGetAssessmentResponse,
  OneTrustGetRiskResponse,
  OneTrustGetUserResponse,
  OneTrustAssessmentCreatedBy,
} from './endpoints/index.js';

/** The default OneTrust Get Assessment risk response enriched with Get Risk response. */
export const OneTrustEnrichedRisk = t.intersection([
  OneTrustAssessmentQuestionRisk,
  OneTrustGetRiskResponse,
]);

/** Type override */
export type OneTrustEnrichedRisk = t.TypeOf<typeof OneTrustEnrichedRisk>;

export const OneTrustEnrichedRisks = t.union([t.array(OneTrustEnrichedRisk), t.null]);

/** Type override */
export type OneTrustEnrichedRisks = t.TypeOf<typeof OneTrustEnrichedRisks>;

export const OneTrustQuestionComment = t.type({
  comment: t.string,
  CreatedBy: t.string,
  CreateDate: t.string,
});

/**
 * A OneTrust comment manually injected to the question
 */
export type OneTrustQuestionComment = t.TypeOf<typeof OneTrustQuestionComment>;

export const OneTrustQuestionComments = t.array(OneTrustQuestionComment);

/**
 * A list of OneTrust comment manually injected to the question
 */
export type OneTrustQuestionComments = t.TypeOf<typeof OneTrustQuestionComments>;

/** The default OneTrust Get Assessment question response with enriched risks. */
export const OneTrustEnrichedAssessmentQuestion = t.intersection([
  t.type({
    ...OneTrustAssessmentQuestion.types[0].props,
    risks: OneTrustEnrichedRisks,
  }),
  t.partial({
    ...OneTrustAssessmentQuestion.types[1].props,
    comments: OneTrustQuestionComments,
  }),
]);

/** Type override */
export type OneTrustEnrichedAssessmentQuestion = t.TypeOf<
  typeof OneTrustEnrichedAssessmentQuestion
>;

/** The default OneTrust Get Assessment section response with enriched questions. */
export const OneTrustEnrichedAssessmentSection = t.type({
  ...OneTrustAssessmentSection.props,
  questions: t.array(OneTrustEnrichedAssessmentQuestion),
});

/** Type override */
export type OneTrustEnrichedAssessmentSection = t.TypeOf<typeof OneTrustEnrichedAssessmentSection>;

/** The OneTrust Get User details about a user. */
export const OneTrustUserDetails = t.type({
  active: OneTrustGetUserResponse.props.active,
  userType: OneTrustGetUserResponse.props.userType,
  emails: OneTrustGetUserResponse.props.emails,
  title: OneTrustGetUserResponse.props.title,
  givenName: t.union([t.string, t.null]),
  familyName: t.union([t.string, t.null]),
});
/** Type override */
export type OneTrustUserDetails = t.TypeOf<typeof OneTrustUserDetails>;

/** The default OneTrust Get Assessmenr user response enriched with Get User response */
export const OneTrustEnrichedUser = t.type({
  ...OneTrustAssessmentCreatedBy.props,
  ...OneTrustUserDetails.props,
});

/** Type override */
export type OneTrustEnrichedUser = t.TypeOf<typeof OneTrustEnrichedUser>;

/** The default OneTrust Get Assessment response with enriched approvers, respondents, creator, and sections */
export const OneTrustEnrichedAssessmentResponse = t.type({
  ...OneTrustGetAssessmentResponse.props,
  approvers: t.array(
    t.type({
      ...OneTrustApprover.props,
      approver: t.type({
        ...OneTrustApprover.props.approver.props,
        ...OneTrustUserDetails.props,
      }),
    }),
  ),
  respondents: t.array(
    t.intersection([
      t.type({
        ...OneTrustGetAssessmentResponse.props.respondent.props,
      }),
      t.partial({
        ...OneTrustUserDetails.props,
      }),
    ]),
  ),
  createdBy: OneTrustEnrichedUser,
  sections: t.array(OneTrustEnrichedAssessmentSection),
});
/** Type override */
export type OneTrustEnrichedAssessmentResponse = t.TypeOf<
  typeof OneTrustEnrichedAssessmentResponse
>;

/** The default OneTrust Get List of Assessments response with enriched assessment */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { status, ...OneTrustAssessmentWithoutStatus } = OneTrustAssessment.props;
export const OneTrustEnrichedAssessment = t.intersection([
  t.type(OneTrustAssessmentWithoutStatus),
  OneTrustEnrichedAssessmentResponse,
]);

/** Type override */
export type OneTrustEnrichedAssessment = t.TypeOf<typeof OneTrustEnrichedAssessment>;

export const OneTrustEnrichedAssessments = t.array(OneTrustEnrichedAssessment);

/** Type override */
export type OneTrustEnrichedAssessments = t.TypeOf<typeof OneTrustEnrichedAssessments>;
