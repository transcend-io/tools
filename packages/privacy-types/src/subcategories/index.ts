import { makeEnum } from '@transcend-io/type-utils';

import { ConnectionSubCategory } from './connection.js';
import { ContactSubCategory } from './contact.js';
import { DemographicSubCategory } from './demographic.js';
import { DeviceSubCategory } from './device.js';
import { FinancialSubCategory } from './financial.js';
import { HealthSubCategory } from './health.js';
import { IdSubCategory } from './id.js';
import { LocationSubCategory } from './location.js';
import { NotPersonalDataSubCategory } from './notPersonalData.js';
import { OnlineActivitySubCategory } from './onlineActivity.js';
import { SocialMediaSubCategory } from './socialMedia.js';
import { SurveySubCategory } from './survey.js';
import { TrackingSubCategory } from './tracking.js';
import { UserProfileSubCategory } from './userProfile.js';

export const DefaultDataSubCategoryType = makeEnum({
  ...ConnectionSubCategory,
  ...ContactSubCategory,
  ...DemographicSubCategory,
  ...DeviceSubCategory,
  ...FinancialSubCategory,
  ...HealthSubCategory,
  ...IdSubCategory,
  ...LocationSubCategory,
  ...OnlineActivitySubCategory,
  ...SocialMediaSubCategory,
  ...SurveySubCategory,
  ...TrackingSubCategory,
  ...UserProfileSubCategory,
  ...NotPersonalDataSubCategory,
});

/**
 * Overload type
 */
export type DefaultDataSubCategoryType =
  (typeof DefaultDataSubCategoryType)[keyof typeof DefaultDataSubCategoryType];
