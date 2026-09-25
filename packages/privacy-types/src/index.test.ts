import { describe, expect, it } from 'vitest';

import {
  DefaultDataSubCategoryType,
  DefaultPurposeSubCategoryType,
  LocaleCodec,
  RequestAction,
} from './index.js';

describe('@transcend-io/privacy-types', () => {
  it('exports ACCESS as a request action', () => {
    expect(Object.values(RequestAction)).toContain('ACCESS');
  });

  it('exports EMAIL as a data subcategory', () => {
    expect(Object.values(DefaultDataSubCategoryType)).toContain('EMAIL');
  });

  it('exports APPROXIMATE_LOCATION as a data subcategory', () => {
    expect(Object.values(DefaultDataSubCategoryType)).toContain('APPROXIMATE_LOCATION');
  });

  it('exports ESSENTIAL as a purpose subcategory', () => {
    expect(Object.values(DefaultPurposeSubCategoryType)).toContain('ESSENTIAL');
  });

  it('exports the shared locale codec', () => {
    expect(LocaleCodec.name).toBe('Locale');
    expect(LocaleCodec.is('en')).toBe(true);
    expect(LocaleCodec.is('not-a-locale')).toBe(false);
  });
});
