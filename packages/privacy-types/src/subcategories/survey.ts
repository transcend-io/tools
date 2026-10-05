import { makeEnum } from '@transcend-io/type-utils';

export const SurveySubCategory = {
  // TODO: https://transcend.height.app/T-14003 - add more subcategories
  /** Fallback subcategory */
  Survey: 'SURVEY',
} as const;

/**
 * Overload with type of integration
 */
export type SurveySubCategory = (typeof SurveySubCategory)[keyof typeof SurveySubCategory];
