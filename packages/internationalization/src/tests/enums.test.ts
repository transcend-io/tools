import { describe, expect, it } from 'vitest';

import { LOCALE_BROWSER_MAP, type BrowserLocaleKey } from '../enums.js';

describe('LOCALE_BROWSER_MAP', () => {
  it('keeps browser locale keys narrow', () => {
    const knownBrowserLocale: BrowserLocaleKey = 'af';

    expect(LOCALE_BROWSER_MAP[knownBrowserLocale]).toBe('af-ZA');

    // @ts-expect-error regression guard: BrowserLocaleKey must stay a finite union
    const invalidBrowserLocale: BrowserLocaleKey = 'not-a-browser-locale';
    expect(invalidBrowserLocale).toBe('not-a-browser-locale');

    // @ts-expect-error regression guard: BrowserLocaleKey must not widen to string | number
    const numericBrowserLocale: BrowserLocaleKey = 1;
    expect(numericBrowserLocale).toBe(1);
  });
});
