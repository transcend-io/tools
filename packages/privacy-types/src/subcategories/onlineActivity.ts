import { makeEnum } from '@transcend-io/type-utils';

export const OnlineActivitySubCategory = makeEnum({
  /** Declared interests */
  DeclaredInterests: 'DECLARED_INTERESTS',
  /** Page views */
  PageViews: 'PAGE_VIEWS',
  /** Interaction events */
  InteractionEvents: 'INTERACTION_EVENTS',
  /** Fallback subcategory */
  OnlineActivity: 'ONLINE_ACTIVITY',
});

/**
 * Overload with type of integration
 */
export type OnlineActivitySubCategory =
  (typeof OnlineActivitySubCategory)[keyof typeof OnlineActivitySubCategory];
