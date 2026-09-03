import { describe, expect, it } from 'vitest';

import {
  COOKIE_TRIAGE_PURPOSE_LABELS,
  COOKIE_TRIAGE_PURPOSE_ORDER,
  isDefaultCookiePurposeSlug,
  isUnknownCookiePurposeSlug,
  resolvePrimaryCookiePurpose,
} from '../src/lib/resolvePrimaryCookiePurpose.js';

describe('COOKIE_TRIAGE_PURPOSE_ORDER', () => {
  it('lists purposes in tab display order with Custom last', () => {
    expect(COOKIE_TRIAGE_PURPOSE_ORDER).toEqual([
      'Essential',
      'Functional',
      'Advertising',
      'Analytics',
      'SaleOfInfo',
      'Unknown',
      'Custom',
    ]);
  });
});

describe('COOKIE_TRIAGE_PURPOSE_LABELS', () => {
  it('maps SaleOfInfo, Custom, and Unknown to app copy', () => {
    expect(COOKIE_TRIAGE_PURPOSE_LABELS.SaleOfInfo).toBe('Sale of Personal Info');
    expect(COOKIE_TRIAGE_PURPOSE_LABELS.Custom).toBe('Custom');
    expect(COOKIE_TRIAGE_PURPOSE_LABELS.Unknown).toBe('Unknown');
  });
});

describe('isDefaultCookiePurposeSlug', () => {
  it('matches built-in slugs case-insensitively', () => {
    expect(isDefaultCookiePurposeSlug('Analytics')).toBe(true);
    expect(isDefaultCookiePurposeSlug('essential')).toBe(true);
    expect(isDefaultCookiePurposeSlug('Loyalty')).toBe(false);
    expect(isDefaultCookiePurposeSlug('Unknown')).toBe(false);
  });
});

describe('isUnknownCookiePurposeSlug', () => {
  it('matches Unknown case-insensitively', () => {
    expect(isUnknownCookiePurposeSlug('Unknown')).toBe(true);
    expect(isUnknownCookiePurposeSlug('unknown')).toBe(true);
    expect(isUnknownCookiePurposeSlug('Loyalty')).toBe(false);
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

  it('returns Unknown for empty, missing, or Unknown-only lists', () => {
    expect(resolvePrimaryCookiePurpose([])).toBe('Unknown');
    expect(resolvePrimaryCookiePurpose(undefined)).toBe('Unknown');
    expect(resolvePrimaryCookiePurpose(null)).toBe('Unknown');
    expect(resolvePrimaryCookiePurpose(['Unknown'])).toBe('Unknown');
    expect(resolvePrimaryCookiePurpose(['unknown'])).toBe('Unknown');
  });

  it('returns Custom when only unrecognized non-Unknown slugs are present', () => {
    expect(resolvePrimaryCookiePurpose(['Loyalty', 'CustomPurpose'])).toBe('Custom');
    expect(resolvePrimaryCookiePurpose(['Unknown', 'CustomPurpose'])).toBe('Custom');
  });

  it('ignores unrecognized slugs and uses the best known match', () => {
    expect(resolvePrimaryCookiePurpose(['Unknown', 'Analytics'])).toBe('Analytics');
  });
});
