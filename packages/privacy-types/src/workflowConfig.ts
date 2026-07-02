import { makeEnum } from '@transcend-io/type-utils';

/** The type of workflow config */
export const WorkflowConfigType = makeEnum({
  /** Standard data subject request workflow */
  DSR: 'DSR',
  /** Preference management workflow */
  PreferenceManagement: 'PREFERENCE_MANAGEMENT',
});

/** Override type */
export type WorkflowConfigType = (typeof WorkflowConfigType)[keyof typeof WorkflowConfigType];

/** The access tier for a workflow config */
export const WorkflowConfigVisibility = makeEnum({
  /** Workflow is saved as a draft and can only run test requests */
  Draft: 'DRAFT',
  /** Workflow is available for internal Admin Dashboard request creation */
  Internal: 'INTERNAL',
  /** Workflow is available internally and in the deployed Privacy Center */
  Published: 'PUBLISHED',
});

/** Override type */
export type WorkflowConfigVisibility =
  (typeof WorkflowConfigVisibility)[keyof typeof WorkflowConfigVisibility];
