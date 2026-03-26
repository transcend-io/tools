import { describe, expect, it } from 'vitest';

import {
  DefaultDataSubCategoryType,
  DefaultPurposeSubCategoryType,
  RequestAction,
} from './index.js';

describe('@transcend-io/privacy-types', () => {
  it('exports ACCESS as a request action', () => {
    expect(Object.values(RequestAction)).toContain('ACCESS');
  });

  it('exports EMAIL as a data subcategory', () => {
    expect(Object.values(DefaultDataSubCategoryType)).toContain('EMAIL');
  });

  it('exports ESSENTIAL as a purpose subcategory', () => {
    expect(Object.values(DefaultPurposeSubCategoryType)).toContain('ESSENTIAL');
  });
});
