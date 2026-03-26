import { makeEnum } from '@transcend-io/type-utils';

/** Information about an individual's finances */
export const FinancialSubCategory = makeEnum({
  /** Account number */
  AccountNumber: 'ACCOUNT_NUMBER',
  /** Credit Card Number */
  CreditCardNumber: 'CREDIT_CARD_NUMBER',
  /** Income */
  Income: 'INCOME',
  /** Tax information */
  Tax: 'TAX',
  /** Routing number */
  RoutingNumber: 'ROUTING_NUMBER',
  /** Fallback subcategory */
  Financial: 'FINANCIAL',
});

/**
 * Overload with type of integration
 */
export type FinancialSubCategory = (typeof FinancialSubCategory)[keyof typeof FinancialSubCategory];
