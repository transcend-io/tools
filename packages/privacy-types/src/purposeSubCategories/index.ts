import { makeEnum } from '@transcend-io/type-utils';

import { AdditionalPurposeSubCategory } from './additional.js';
import { AdvertisingPurposeSubCategory } from './advertising.js';
import { AnalyticsPurposeSubCategory } from './analytics.js';
import { EssentialPurposeSubCategory } from './essential.js';
import { HRPurposeSubCategory } from './hr.js';
import { LegalPurposeSubCategory } from './legal.js';
import { MarketingPurposeSubCategory } from './marketing.js';
import { OperationSecurityPurposeSubCategory } from './operationSecurity.js';
import { OtherPurposeSubCategory } from './other.js';
import { PersonalizationPurposeSubCategory } from './personalization.js';
import { SalePurposeSubCategory } from './sale.js';
import { TransferPurposeSubCategory } from './transfer.js';

export const DefaultPurposeSubCategoryType = makeEnum({
  ...AdditionalPurposeSubCategory,
  ...AdvertisingPurposeSubCategory,
  ...AnalyticsPurposeSubCategory,
  ...EssentialPurposeSubCategory,
  ...HRPurposeSubCategory,
  ...LegalPurposeSubCategory,
  ...MarketingPurposeSubCategory,
  ...OperationSecurityPurposeSubCategory,
  ...OtherPurposeSubCategory,
  ...PersonalizationPurposeSubCategory,
  ...SalePurposeSubCategory,
  ...TransferPurposeSubCategory,
});

/**
 * Overload type
 */
export type DefaultPurposeSubCategoryType =
  (typeof DefaultPurposeSubCategoryType)[keyof typeof DefaultPurposeSubCategoryType];
