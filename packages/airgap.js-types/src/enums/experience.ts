// main
import { makeEnum } from '@transcend-io/type-utils';

/**
 * Describes whether listed countries/country subdivisions are included in an experience
 */
export const RegionsOperator = makeEnum({
  /** The listed countries/country subdivisions, time zones, and languages are included in this experience */
  In: 'IN',
  /** The listed countries/country subdivisions, time zones, and languages are NOT included in this experience */
  NotIn: 'NOT_IN',
});
/** Override type */
export type RegionsOperator =
  (typeof RegionsOperator)[keyof typeof RegionsOperator];
