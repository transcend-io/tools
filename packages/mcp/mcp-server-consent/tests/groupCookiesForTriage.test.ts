import { describe, expect, it } from 'vitest';

import { CookieTriagePurposeCategory } from '../src/lib/cookieTriageConfig.js';
import type { CookieTriageAnalysis } from '../src/lib/cookieTriageTypes.js';
import { groupCookiesForTriage } from '../src/lib/groupCookiesForTriage.js';

describe('groupCookiesForTriage', () => {
  it('groups by primary purpose from trackingPurposes and sorts by occurrences', () => {
    const cookies: CookieTriageAnalysis[] = [
      {
        name: 'low-analytics',
        trackingPurposes: [CookieTriagePurposeCategory.Analytics],
        occurrences: 1,
      },
      {
        name: 'essential',
        trackingPurposes: [CookieTriagePurposeCategory.Essential],
        occurrences: 5,
      },
      {
        name: 'high-analytics',
        trackingPurposes: [
          CookieTriagePurposeCategory.Analytics,
          CookieTriagePurposeCategory.Advertising,
        ],
        occurrences: 100,
      },
      {
        name: 'custom-purpose',
        trackingPurposes: ['Loyalty'],
        occurrences: 3,
      },
      {
        name: 'orphan',
      },
    ];

    const categories = groupCookiesForTriage(cookies);

    expect(categories.map((category) => category.purpose)).toEqual([
      CookieTriagePurposeCategory.Essential,
      CookieTriagePurposeCategory.Advertising,
      CookieTriagePurposeCategory.Analytics,
      CookieTriagePurposeCategory.Unknown,
      CookieTriagePurposeCategory.Custom,
    ]);
    expect(
      categories.find((category) => category.purpose === CookieTriagePurposeCategory.Advertising)
        ?.cookies[0]?.name,
    ).toBe('high-analytics');
    expect(
      categories
        .find((category) => category.purpose === CookieTriagePurposeCategory.Analytics)
        ?.cookies.map((c) => c.name),
    ).toEqual(['low-analytics']);
    expect(
      categories.find((category) => category.purpose === CookieTriagePurposeCategory.Custom)
        ?.cookies[0]?.name,
    ).toBe('custom-purpose');
    expect(
      categories.find((category) => category.purpose === CookieTriagePurposeCategory.Unknown)
        ?.totalCount,
    ).toBe(1);
  });

  it('caps each purpose at 100 cookies and keeps full totalCount', () => {
    const cookies: CookieTriageAnalysis[] = Array.from({ length: 105 }, (_, index) => ({
      name: `cookie-${index}`,
      trackingPurposes: [CookieTriagePurposeCategory.Essential],
      occurrences: index,
    }));

    const [essential] = groupCookiesForTriage(cookies);

    expect(essential?.purpose).toBe(CookieTriagePurposeCategory.Essential);
    expect(essential?.totalCount).toBe(105);
    expect(essential?.shownCount).toBe(100);
    expect(essential?.cookies).toHaveLength(100);
    expect(essential?.cookies[0]?.name).toBe('cookie-104');
    expect(essential?.cookies[99]?.name).toBe('cookie-5');
  });
});
