import { makeEnum } from '@transcend-io/type-utils';

/** The type of workflow config */
export const WorkflowConfigType = {
  /** Standard data subject request workflow */
  DSR: 'DSR',
  /** Preference management workflow */
  PreferenceManagement: 'PREFERENCE_MANAGEMENT',
} as const;

/** Override type */
export type WorkflowConfigType = (typeof WorkflowConfigType)[keyof typeof WorkflowConfigType];

/** The access tier for a workflow config */
export const WorkflowConfigVisibility = {
  /** Workflow is saved as a draft and can only run test requests */
  Draft: 'DRAFT',
  /** Workflow is available for internal Admin Dashboard request creation */
  Internal: 'INTERNAL',
  /** Workflow is available internally and in the deployed Privacy Center */
  Published: 'PUBLISHED',
} as const;

/** Override type */
export type WorkflowConfigVisibility =
  (typeof WorkflowConfigVisibility)[keyof typeof WorkflowConfigVisibility];

/** Whether a workflow collects the data subject's region during intake */
export const CollectDataSubjectRegions = {
  /** Do not collect the data subject's region */
  DoNotCollect: 'DO_NOT_COLLECT',
  /** Collect the data subject's region */
  Collect: 'COLLECT',
} as const;

/** Override type */
export type CollectDataSubjectRegions =
  (typeof CollectDataSubjectRegions)[keyof typeof CollectDataSubjectRegions];
