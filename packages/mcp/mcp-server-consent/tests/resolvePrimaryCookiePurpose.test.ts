import { describe, expect, it } from 'vitest';

import { CookieTriagePurposeCategory } from '../src/lib/cookieTriageConfig.js';
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
      CookieTriagePurposeCategory.Essential,
      CookieTriagePurposeCategory.Functional,
      CookieTriagePurposeCategory.Advertising,
      CookieTriagePurposeCategory.Analytics,
      CookieTriagePurposeCategory.SaleOfInfo,
      CookieTriagePurposeCategory.Unknown,
      CookieTriagePurposeCategory.Custom,
    ]);
  });
});

describe('COOKIE_TRIAGE_PURPOSE_LABELS', () => {
  it('maps SaleOfInfo, Custom, and Unknown to app copy', () => {
    expect(COOKIE_TRIAGE_PURPOSE_LABELS[CookieTriagePurposeCategory.SaleOfInfo]).toBe(
      'Sale of Info',
    );
    expect(COOKIE_TRIAGE_PURPOSE_LABELS[CookieTriagePurposeCategory.Custom]).toBe('Custom');
    expect(COOKIE_TRIAGE_PURPOSE_LABELS[CookieTriagePurposeCategory.Unknown]).toBe('Unknown');
  });
});

describe('isDefaultCookiePurposeSlug', () => {
  it('matches built-in slugs case-insensitively', () => {
    expect(isDefaultCookiePurposeSlug('Analytics')).toBe(true);
    expect(isDefaultCookiePurposeSlug('essential')).toBe(true);
    expect(isDefaultCookiePurposeSlug('Loyalty')).toBe(false);
    expect(isDefaultCookiePurposeSlug(CookieTriagePurposeCategory.Unknown)).toBe(false);
  });
});

describe('isUnknownCookiePurposeSlug', () => {
  it('matches Unknown case-insensitively', () => {
    expect(isUnknownCookiePurposeSlug(CookieTriagePurposeCategory.Unknown)).toBe(true);
    expect(isUnknownCookiePurposeSlug('unknown')).toBe(true);
    expect(isUnknownCookiePurposeSlug('Loyalty')).toBe(false);
  });
});

describe('resolvePrimaryCookiePurpose', () => {
  it('returns the sole purpose when only one slug is assigned', () => {
    expect(resolvePrimaryCookiePurpose(['Analytics'])).toBe(CookieTriagePurposeCategory.Analytics);
    expect(resolvePrimaryCookiePurpose(['essential'])).toBe(CookieTriagePurposeCategory.Essential);
  });

  it('picks the highest-ranked purpose when multiple slugs are assigned', () => {
    expect(resolvePrimaryCookiePurpose(['Analytics', 'Essential'])).toBe(
      CookieTriagePurposeCategory.Essential,
    );
    expect(resolvePrimaryCookiePurpose(['SaleOfInfo', 'Functional', 'Advertising'])).toBe(
      CookieTriagePurposeCategory.Functional,
    );
    expect(resolvePrimaryCookiePurpose(['Analytics', 'Advertising'])).toBe(
      CookieTriagePurposeCategory.Advertising,
    );
    expect(resolvePrimaryCookiePurpose(['SaleOfInfo', 'Analytics'])).toBe(
      CookieTriagePurposeCategory.Analytics,
    );
  });

  it('returns Unknown for empty, missing, or Unknown-only lists', () => {
    expect(resolvePrimaryCookiePurpose([])).toBe(CookieTriagePurposeCategory.Unknown);
    expect(resolvePrimaryCookiePurpose(undefined)).toBe(CookieTriagePurposeCategory.Unknown);
    expect(resolvePrimaryCookiePurpose(null)).toBe(CookieTriagePurposeCategory.Unknown);
    expect(resolvePrimaryCookiePurpose(['Unknown'])).toBe(CookieTriagePurposeCategory.Unknown);
    expect(resolvePrimaryCookiePurpose(['unknown'])).toBe(CookieTriagePurposeCategory.Unknown);
  });

  it('returns Custom when only unrecognized non-Unknown slugs are present', () => {
    expect(resolvePrimaryCookiePurpose(['Loyalty', 'CustomPurpose'])).toBe(
      CookieTriagePurposeCategory.Custom,
    );
    expect(resolvePrimaryCookiePurpose(['Unknown', 'CustomPurpose'])).toBe(
      CookieTriagePurposeCategory.Custom,
    );
  });

  it('ignores unrecognized slugs and uses the best known match', () => {
    expect(resolvePrimaryCookiePurpose(['Unknown', 'Analytics'])).toBe(
      CookieTriagePurposeCategory.Analytics,
    );
  });
});
