import { describe, expect, it } from 'vitest';

import {
  lookupRoute,
  normalizeRoute,
  patternMatchesPath,
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
