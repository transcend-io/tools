import { describe, expect, it } from 'vitest';

import {
  findProductTitle,
  lookupRoute,
  normalizeDocUrl,
  normalizeRoute,
  patternMatchesPath,
  resolveRouteProduct,
  type DashboardRouteData,
  type RouteEntry,
  type RouteIndex,
} from '../src/docsRoutes.js';

function entry(primary: string[], mentions: string[] = []): RouteEntry {
  const toPage = (title: string) => ({
    title,
    url: `https://docs.transcend.io/docs/${title.toLowerCase().replace(/\s+/g, '-')}`,
    guideType: null,
  });
  return { primary: primary.map(toPage), mentions: mentions.map(toPage) };
}

const index: RouteIndex = {
  '/privacy-center/general-settings': entry(['General Settings'], ['Publishing Overview']),
  '/privacy-center/:tab': entry(['Privacy Center Tab']),
  '/privacy-center/messages': entry(['Messages']),
  '/requests/:id?': entry(['Requests']),
  '/data-inventory/:type/:id': entry(['Inventory Detail']),
  '/data-inventory/vendors/:id': entry(['Vendor Detail']),
  '/empty/route': entry([]),
};

describe('normalizeRoute', () => {
  it('strips origin, query, hash, and trailing slash', () => {
    expect(
      normalizeRoute('https://app.transcend.io/privacy-center/general-settings/?tab=x#top'),
    ).toBe('/privacy-center/general-settings');
  });

  it('accepts regional app hosts', () => {
    expect(normalizeRoute('https://app.us.transcend.io/requests')).toBe('/requests');
    expect(normalizeRoute('https://app.eu.transcend.io/requests')).toBe('/requests');
  });

  it('adds a leading slash and drops query on plain paths', () => {
    expect(normalizeRoute('requests/?a=1')).toBe('/requests');
    expect(normalizeRoute('/')).toBe('/');
    expect(normalizeRoute('  ')).toBe('/');
  });

  it('drops an app host pasted without a scheme', () => {
    expect(normalizeRoute('app.transcend.io/privacy-center/general-settings')).toBe(
      '/privacy-center/general-settings',
    );
    expect(normalizeRoute('app.eu.transcend.io/requests?a=1')).toBe('/requests');
    expect(normalizeRoute('app.transcend.io')).toBe('/');
  });

  it('rejects URLs that are not app dashboard hosts', () => {
    expect(() => normalizeRoute('https://evil.example.com/requests')).toThrow(/app\.transcend\.io/);
    expect(() => normalizeRoute('https://app.transcend.io.evil.com/requests')).toThrow(
      /app\.transcend\.io/,
    );
  });
});

describe('patternMatchesPath', () => {
  it('matches a param segment against exactly one segment', () => {
    expect(patternMatchesPath('/a/:id', '/a/1')).toBe(true);
    expect(patternMatchesPath('/a/:id', '/a')).toBe(false);
    expect(patternMatchesPath('/a/:id', '/a/1/2')).toBe(false);
  });

  it('matches an optional trailing segment against zero or one segment', () => {
    expect(patternMatchesPath('/a/:id?', '/a')).toBe(true);
    expect(patternMatchesPath('/a/:id?', '/a/1')).toBe(true);
    expect(patternMatchesPath('/a/:id?', '/a/1/2')).toBe(false);
  });

  it('does not match a different literal', () => {
    expect(patternMatchesPath('/a/b', '/a/c')).toBe(false);
  });
});

describe('lookupRoute', () => {
  it('matches an exact route and returns primary pages before mentions', () => {
    const result = lookupRoute(index, '/privacy-center/general-settings');
    expect(result?.pattern).toBe('/privacy-center/general-settings');
    expect(result?.isParentFallback).toBe(false);
    expect(result?.pages.map(({ title, match, route }) => ({ title, match, route }))).toEqual([
      {
        title: 'General Settings',
        match: 'primary',
        route: '/privacy-center/general-settings',
      },
      {
        title: 'Publishing Overview',
        match: 'mention',
        route: '/privacy-center/general-settings',
      },
    ]);
  });

  it('matches a param segment', () => {
    expect(lookupRoute(index, '/privacy-center/domains')?.pattern).toBe('/privacy-center/:tab');
  });

  it('matches an optional segment with and without the segment', () => {
    expect(lookupRoute(index, '/requests')?.pattern).toBe('/requests/:id?');
    expect(lookupRoute(index, '/requests/abc')?.pattern).toBe('/requests/:id?');
  });

  it('accepts a full app URL', () => {
    const result = lookupRoute(
      index,
      'https://app.transcend.io/privacy-center/general-settings?tab=x',
    );
    expect(result?.pattern).toBe('/privacy-center/general-settings');
  });

  it('accepts a route pattern as input', () => {
    expect(lookupRoute(index, '/data-inventory/vendors/:id')?.pattern).toBe(
      '/data-inventory/vendors/:id',
    );
  });

  it('prefers the pattern with the most literal segments', () => {
    expect(lookupRoute(index, '/privacy-center/messages')?.pattern).toBe(
      '/privacy-center/messages',
    );
    expect(lookupRoute(index, '/data-inventory/vendors/42')?.pattern).toBe(
      '/data-inventory/vendors/:id',
    );
    expect(lookupRoute(index, '/data-inventory/silos/42')?.pattern).toBe(
      '/data-inventory/:type/:id',
    );
  });

  it('falls back to the longest matching parent path', () => {
    const result = lookupRoute(index, '/privacy-center/general-settings/deployment/extra');
    expect(result?.pattern).toBe('/privacy-center/general-settings');
    expect(result?.isParentFallback).toBe(true);
  });

  it('skips matched patterns that have no pages when falling back', () => {
    expect(lookupRoute(index, '/empty/route')).toBeUndefined();
  });

  it('returns undefined when nothing matches', () => {
    expect(lookupRoute(index, '/unknown/page')).toBeUndefined();
    expect(lookupRoute(index, '/')).toBeUndefined();
  });
});

describe('product helpers', () => {
  const data: DashboardRouteData = {
    routes: {
      '/privacy-center/general-settings': { ...entry(['A']), product: 'Privacy Center' },
      '/privacy-center/legacy': entry(['B']),
    },
    productPrefixes: [
      { prefix: '/privacy-center/special', product: 'Web Auditor' },
      { prefix: '/privacy-center', product: 'Privacy Center' },
      { prefix: '/settings', product: null },
    ],
  };

  it('prefers the matched route entry product', () => {
    const lookup = lookupRoute(data.routes, '/privacy-center/general-settings');
    expect(resolveRouteProduct(data, '/privacy-center/general-settings', lookup)).toBe(
      'Privacy Center',
    );
  });

  it('falls back to the longest matching prefix on segment boundaries', () => {
    expect(resolveRouteProduct(data, '/privacy-center/special/x')).toBe('Web Auditor');
    expect(resolveRouteProduct(data, '/privacy-center/legacy')).toBe('Privacy Center');
    expect(resolveRouteProduct(data, '/privacy-centers')).toBeUndefined();
  });

  it('returns undefined for platform routes and indexes without prefixes', () => {
    expect(resolveRouteProduct(data, '/settings/sso')).toBeUndefined();
    expect(resolveRouteProduct({ routes: {} }, '/privacy-center')).toBeUndefined();
  });

  it('matches product titles case-insensitively', () => {
    expect(findProductTitle(' dsr automation ')).toBe('DSR Automation');
    expect(findProductTitle('billing')).toBeUndefined();
  });

  it('normalizes doc URLs across .md, trailing slash, and relative forms', () => {
    expect(normalizeDocUrl('https://docs.transcend.io/docs/a/B.md')).toBe('/docs/a/b');
    expect(normalizeDocUrl('/docs/a/b/')).toBe('/docs/a/b');
  });
});
