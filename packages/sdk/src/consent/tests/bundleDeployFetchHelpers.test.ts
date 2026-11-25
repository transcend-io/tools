import { beforeEach, describe, expect, it, vi } from 'vitest';

const gotMock = vi.hoisted(() => ({
  json: vi.fn(),
  text: vi.fn(),
}));

vi.mock('got', () => ({
  default: vi.fn((url: string) => ({
    json: () => gotMock.json(url),
    text: () => gotMock.text(url),
  })),
}));

import {
  cdnOriginFromBundleUrl,
  fetchConsentCdnJson,
  fetchConsentCdnText,
  fetchDeployedCompanionModules,
  parseConsentBundleConfigJson,
} from '../bundleDeployPreview/bundleDeployFetchHelpers.js';

describe('parseConsentBundleConfigJson', () => {
  it('parses valid JSON', () => {
    expect(parseConsentBundleConfigJson('{"core":{"v":1}}')).toEqual({ core: { v: 1 } });
  });

  it('returns {} on invalid JSON', () => {
    expect(parseConsentBundleConfigJson('not-json')).toEqual({});
  });
});

describe('cdnOriginFromBundleUrl', () => {
  it('returns the script URL origin', () => {
    expect(cdnOriginFromBundleUrl('https://transcend-cdn.com/cm/foo.js')).toBe(
      'https://transcend-cdn.com',
    );
  });

  it('falls back when the URL is invalid', () => {
    expect(cdnOriginFromBundleUrl('not-a-url')).toBe('https://transcend-cdn.com');
  });
});

describe('fetchConsentCdnJson', () => {
  beforeEach(() => {
    gotMock.json.mockReset();
  });

  it('returns parsed JSON', async () => {
    gotMock.json.mockResolvedValue({ ok: true });
    await expect(fetchConsentCdnJson('https://cdn/x.json')).resolves.toEqual({ ok: true });
  });

  it('returns undefined on failure', async () => {
    gotMock.json.mockRejectedValue(new Error('network'));
    await expect(fetchConsentCdnJson('https://cdn/x.json')).resolves.toBeUndefined();
  });
});

describe('fetchConsentCdnText', () => {
  beforeEach(() => {
    gotMock.text.mockReset();
  });

  it('returns response text', async () => {
    gotMock.text.mockResolvedValue('body');
    await expect(fetchConsentCdnText('https://cdn/x.css')).resolves.toBe('body');
  });

  it('returns empty string on failure', async () => {
    gotMock.text.mockRejectedValue(new Error('network'));
    await expect(fetchConsentCdnText('https://cdn/x.css')).resolves.toBe('');
  });
});

describe('fetchDeployedCompanionModules', () => {
  beforeEach(() => {
    gotMock.json.mockReset();
    gotMock.text.mockReset();
    gotMock.json.mockResolvedValue({ fetched: true });
    gotMock.text.mockResolvedValue('.rule{}');
  });

  it('skips fetching when core has no modules map', async () => {
    await expect(fetchDeployedCompanionModules({}, 'https://cdn')).resolves.toEqual({});
  });

  it('loads tcf, native, stylesheet, locale messages, and uiV2 modules', async () => {
    const result = await fetchDeployedCompanionModules(
      {
        modules: {
          tcfVendorsList: { location: 'tcf.json' },
          nativeAppConfig: { location: 'native.json' },
          stylesheet: { location: 's.css' },
          en: { location: 'en.json' },
          'uiV2-en': { location: 'u2.json' },
        },
      },
      'https://transcend-cdn.com',
    );

    expect(result.tcf).toEqual({ fetched: true });
    expect(result.nativeApp).toEqual({ fetched: true });
    expect(result.stylesheet).toBe('.rule{}');
    expect(result.messages).toEqual({ en: { fetched: true } });
    expect(result.uiV2Messages).toEqual({ 'uiV2-en': { fetched: true } });
    expect(gotMock.json).toHaveBeenCalledWith('https://transcend-cdn.com/tcf.json');
    expect(gotMock.text).toHaveBeenCalledWith('https://transcend-cdn.com/s.css');
  });
});
