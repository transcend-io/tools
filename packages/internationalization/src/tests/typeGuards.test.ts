import { describe, expect, it } from 'vitest';

import { LOCALE_KEY, NATIVE_LANGUAGE_NAMES } from '../enums.js';
import { isKnownLocale } from '../typeGuards.js';

describe('isKnownLocale', () => {
  it('accepts known locale values and rejects unknown inputs', () => {
    expect(isKnownLocale(LOCALE_KEY.EnUs)).toBe(true);
    expect(isKnownLocale('not-a-locale')).toBe(false);
    expect(isKnownLocale(['en-US'])).toBe(false);
    expect(isKnownLocale(undefined)).toBe(false);
  });

  it('keeps the locale tables wired together', () => {
    expect(NATIVE_LANGUAGE_NAMES[LOCALE_KEY.FrCa]).toBe('Français (Québec)');
  });
});
