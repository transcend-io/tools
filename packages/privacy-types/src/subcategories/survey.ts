import { makeEnum } from '@transcend-io/type-utils';

export const SurveySubCategory = makeEnum({
  // TODO: https://transcend.height.app/T-14003 - add more subcategories
  /** Fallback subcategory */
  Survey: 'SURVEY',
});

/**
 * Overload with type of integration
 */
export type SurveySubCategory = (typeof SurveySubCategory)[keyof typeof SurveySubCategory];
