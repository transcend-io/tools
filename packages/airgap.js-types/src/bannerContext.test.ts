import { isLeft, isRight } from 'fp-ts/Either';
import { describe, expect, it } from 'vitest';

import {
  BannerContext,
  BannerContextOverridesDropped,
  bannerContextMobileFixture,
  bannerContextWebFixture,
  CoreTrackingConsentDetails,
  StoredBannerContext,
} from './index.js';

const decodeRight = (input: unknown): BannerContext => {
  const decoded = BannerContext.decode(input);
  if (isLeft(decoded)) throw new Error('Expected BannerContext to decode');
  return decoded.right;
};

describe('BannerContext', () => {
  it('decodes both fixtures', () => {
    expect(decodeRight(bannerContextWebFixture)).toEqual(bannerContextWebFixture);
    expect(decodeRight(bannerContextMobileFixture)).toEqual(bannerContextMobileFixture);
  });

  it('strips unknown top-level keys', () => {
    expect(decodeRight({ ...bannerContextWebFixture, futureField: 'x' })).toEqual(
      bannerContextWebFixture,
    );
  });

  it.each([
    ['property', { property: 'desktop' }],
    ['layersSeen', { layersSeen: ['banner', 'toast'] }],
    ['signals', { signals: ['GPC', 'USP'] }],
    ['version', { version: '1' }],
  ])('rejects an invalid %s', (_field, patch) => {
    expect(isLeft(BannerContext.decode({ ...bannerContextWebFixture, ...patch }))).toBe(true);
  });

  it.each(['version', 'property', 'deploymentId', 'experience', 'variant', 'theme', 'locale'])(
    'rejects a missing %s',
    (field) => {
      const input: Record<string, unknown> = { ...bannerContextWebFixture };
      delete input[field];
      expect(isLeft(BannerContext.decode(input))).toBe(true);
    },
  );

  it.each([0, 2, 1.5, -1])('decodes version %s', (version) => {
    expect(decodeRight({ ...bannerContextWebFixture, version }).version).toBe(version);
  });

  it.each([
    { dropped: true, bytes: 2048 },
    { truncated: true, bytes: 2048 },
  ])('rejects backend marker %o as overrides', (overrides) => {
    expect(isLeft(BannerContext.decode({ ...bannerContextWebFixture, overrides }))).toBe(true);
  });

  it('strips unknown overrides keys and keeps known keys', () => {
    const decoded = decodeRight({
      ...bannerContextWebFixture,
      overrides: { forceTheme: 'dark', uiVariables: { a: 'b' }, unknownKey: 1 },
    });
    expect(decoded.overrides).toEqual({ forceTheme: 'dark', uiVariables: { a: 'b' } });
  });

  it('decodes large overrides', () => {
    const uiVariables = Object.fromEntries(
      Array.from({ length: 5000 }, (_, i) => [`key${i}`, 'v'.repeat(100)]),
    );
    const decoded = decodeRight({ ...bannerContextWebFixture, overrides: { uiVariables } });
    expect(decoded.overrides?.uiVariables).toEqual(uiVariables);
  });

  it('returns non-ASCII experience unchanged', () => {
    const experience = 'Zustimmung für Österreich 日本語 🍪';
    expect(decodeRight({ ...bannerContextWebFixture, experience }).experience).toBe(experience);
  });
});

describe('BannerContextOverridesDropped', () => {
  it('decodes the dropped marker', () => {
    expect(isRight(BannerContextOverridesDropped.decode({ dropped: true, bytes: 1_100_000 }))).toBe(
      true,
    );
  });
});

describe('StoredBannerContext', () => {
  it('decodes both fixtures', () => {
    expect(StoredBannerContext.decode(bannerContextWebFixture)).toEqual({
      _tag: 'Right',
      right: bannerContextWebFixture,
    });
    expect(StoredBannerContext.decode(bannerContextMobileFixture)).toEqual({
      _tag: 'Right',
      right: bannerContextMobileFixture,
    });
  });

  it('decodes the dropped marker as overrides', () => {
    const overrides = { dropped: true, bytes: 1_100_000 };
    expect(StoredBannerContext.decode({ ...bannerContextWebFixture, overrides })).toEqual({
      _tag: 'Right',
      right: { ...bannerContextWebFixture, overrides },
    });
  });

  it('strips unknown overrides keys and keeps known keys', () => {
    const decoded = StoredBannerContext.decode({
      ...bannerContextWebFixture,
      overrides: { forceTheme: 'dark', unknownKey: 1 },
    });
    expect(isRight(decoded) && decoded.right.overrides).toEqual({ forceTheme: 'dark' });
  });

  it('rejects the truncated marker as overrides', () => {
    const overrides = { truncated: true, bytes: 2048 };
    expect(isLeft(StoredBannerContext.decode({ ...bannerContextWebFixture, overrides }))).toBe(
      true,
    );
  });
});

describe('CoreTrackingConsentDetails metadata.bannerContext', () => {
  it.each([bannerContextWebFixture, 'not-an-object', null, 42, { version: 'bad' }])(
    'decodes bannerContext %o',
    (bannerContext) => {
      const decoded = CoreTrackingConsentDetails.decode({
        confirmed: true,
        timestamp: '2026-11-20T00:00:00.000Z',
        metadata: { bannerContext },
      });
      expect(isRight(decoded)).toBe(true);
    },
  );
});
