import { RTL_LANGS } from '@transcend-io/internationalization';
import { describe, expect, it } from 'vitest';

import { isRtlLocale } from '../isRtlLocale.js';

describe('intl.isRtlLocale', () => {
  for (const locale of RTL_LANGS) {
    it(`returns true for RTL locale ${locale}`, () => {
      expect(isRtlLocale(locale)).to.equal(true);
    });

    it(`returns true for regional variant ${locale}-XX`, () => {
      expect(isRtlLocale(`${locale}-AE`)).to.equal(true);
    });
  }

  it('returns false for common LTR locales', () => {
    expect(isRtlLocale('en')).to.equal(false);
    expect(isRtlLocale('en-US')).to.equal(false);
    expect(isRtlLocale('fr')).to.equal(false);
    expect(isRtlLocale('de-DE')).to.equal(false);
  });

  it('returns false for empty or malformed locale strings', () => {
    expect(isRtlLocale('')).to.equal(false);
    expect(isRtlLocale('-US')).to.equal(false);
  });
});
