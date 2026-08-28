import { describe, expect, it } from 'vitest';

import {
  COOKIE_TRIAGE_PURPOSE_LABELS,
  COOKIE_TRIAGE_PURPOSE_ORDER,
  resolvePrimaryCookiePurpose,
} from '../src/lib/resolvePrimaryCookiePurpose.js';

describe('COOKIE_TRIAGE_PURPOSE_ORDER', () => {
  it('lists purposes in tab display order', () => {
    expect(COOKIE_TRIAGE_PURPOSE_ORDER).toEqual([
      'Essential',
      'Functional',
      'Advertising',
      'Analytics',
      'SaleOfInfo',
      'NoPurpose',
    ]);
  });
});

describe('COOKIE_TRIAGE_PURPOSE_LABELS', () => {
  it('maps SaleOfInfo and NoPurpose to app copy', () => {
    expect(COOKIE_TRIAGE_PURPOSE_LABELS.SaleOfInfo).toBe('Sale of Personal Info');
    expect(COOKIE_TRIAGE_PURPOSE_LABELS.NoPurpose).toBe('Other');
  });
});

describe('resolvePrimaryCookiePurpose', () => {
  it('returns the sole purpose when only one slug is assigned', () => {
    expect(resolvePrimaryCookiePurpose(['Analytics'])).toBe('Analytics');
    expect(resolvePrimaryCookiePurpose(['essential'])).toBe('Essential');
  });

  it('picks the highest-ranked purpose when multiple slugs are assigned', () => {
    expect(resolvePrimaryCookiePurpose(['Analytics', 'Essential'])).toBe('Essential');
    expect(resolvePrimaryCookiePurpose(['SaleOfInfo', 'Functional', 'Advertising'])).toBe(
      'Functional',
    );
    expect(resolvePrimaryCookiePurpose(['Analytics', 'Advertising'])).toBe('Advertising');
    expect(resolvePrimaryCookiePurpose(['SaleOfInfo', 'Analytics'])).toBe('Analytics');
  });

  it('returns NoPurpose for empty or missing lists', () => {
    expect(resolvePrimaryCookiePurpose([])).toBe('NoPurpose');
    expect(resolvePrimaryCookiePurpose(undefined)).toBe('NoPurpose');
    expect(resolvePrimaryCookiePurpose(null)).toBe('NoPurpose');
  });

  it('returns NoPurpose when only unrecognized slugs are present', () => {
    expect(resolvePrimaryCookiePurpose(['Unknown', 'CustomPurpose'])).toBe('NoPurpose');
  });

  it('ignores unrecognized slugs and uses the best known match', () => {
    expect(resolvePrimaryCookiePurpose(['Unknown', 'Analytics'])).toBe('Analytics');
  });
});
