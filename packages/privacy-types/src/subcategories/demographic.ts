import { makeEnum } from '@transcend-io/type-utils';

/** Information about the features or characteristics of a user */
export const DemographicSubCategory = makeEnum({
  /** Information about an individual's racial or ethnic origin */
  RaceOrEthnicity: 'RACE_OR_ETHNICITY',
  /** An individual's gender */
  Gender: 'GENDER',
  /** An individual's date of birth */
  DateOfBirth: 'DATE_OF_BIRTH',
  /** An individual's country, city, or other static location information */
  Region: 'REGION',
  /** The industry in which an individual works */
  Industry: 'INDUSTRY',
  /** An individual's sexual orientation */
  SexualOrientation: 'SEXUAL_ORIENTATION',
  /** Information about an individual's union membership */
  UnionMembership: 'UNION_MEMBERSHIP',
  /** Information about an individual's religious beliefs */
  Religion: 'RELIGION',
  /** Information about an individual's political beliefs or party membership */
  PoliticalAffiliation: 'POLITICAL_AFFILIATION',
  /** Fallback subcategory */
  Demographic: 'DEMOGRAPHIC',
});

/**
 * Overload with type of integration
 */
export type DemographicSubCategory =
  (typeof DemographicSubCategory)[keyof typeof DemographicSubCategory];
