import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DASHBOARD_ROUTES_URL,
  getRouteIndex,
  LLMS_TXT_URL,
  parseDashboardRoutes,
  resetDocsCachesForTests,
  RouteIndexUnavailableError,
} from '../src/docsIndex.js';
import { createDocsListTool } from '../src/tools/docs_list.js';

const LLMS_TXT = '## General\n- [DSR Automation](https://docs.transcend.io/docs/dsr.md)\n';

const ROUTES_JSON = JSON.stringify({
  routes: {
    '/privacy-center/general-settings': {
      primary: [
        {
          title: 'Saving and publishing to the Privacy Center',
          url: 'https://docs.transcend.io/docs/privacy-center/saving',
          guideType: 'Overviews & Concepts',
        },
      ],
      mentions: [
        {
          title: 'Consent setup',
          url: 'https://docs.transcend.io/docs/consent/setup',
          guideType: null,
        },
      ],
    },
  },
});

type ListResult = {
  data: Array<{
    title: string;
    url: string;
    guideType: string | null;
    match: string;
    route: string;
  }>;
  count: number;
  paginationNote: string;
};

function mockFetch(routes: () => Response): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url === DASHBOARD_ROUTES_URL) {
      return routes();
    }
    if (url === LLMS_TXT_URL) {
      return new Response(LLMS_TXT, { status: 200 });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

afterEach(() => {
  resetDocsCachesForTests();
  vi.restoreAllMocks();
});

describe('parseDashboardRoutes', () => {
  it('defaults missing arrays and null guide types', () => {
    expect(
      parseDashboardRoutes(
        JSON.stringify({
          routes: { '/a': { primary: [{ title: 'A', url: 'https://docs.transcend.io/a' }] } },
        }),
      ),
    ).toEqual({
      '/a': {
        primary: [{ title: 'A', url: 'https://docs.transcend.io/a', guideType: null }],
        mentions: [],
      },
    });
  });

  it('rejects an invalid shape', () => {
    expect(() => parseDashboardRoutes('{"routes":{"/a":{"primary":[{"title":1}]}}}')).toThrow();
    expect(() => parseDashboardRoutes('{}')).toThrow();
  });
});

describe('getRouteIndex', () => {
  it('fetches once and serves later calls from cache', async () => {
    const fetchMock = mockFetch(() => new Response(ROUTES_JSON, { status: 200 }));
    await getRouteIndex();
    await getRouteIndex();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws RouteIndexUnavailableError on 404', async () => {
    mockFetch(() => new Response('nope', { status: 404 }));
    await expect(getRouteIndex()).rejects.toBeInstanceOf(RouteIndexUnavailableError);
  });

  it('throws RouteIndexUnavailableError on invalid JSON', async () => {
    mockFetch(() => new Response('{"routes": []}', { status: 200 }));
    await expect(getRouteIndex()).rejects.toBeInstanceOf(RouteIndexUnavailableError);
  });
});

describe('docs_list route', () => {
  it('returns primary pages then mentions for an app URL', async () => {
    mockFetch(() => new Response(ROUTES_JSON, { status: 200 }));
    const tool = createDocsListTool();
    const result = (await tool.handler({
      route: 'https://app.transcend.io/privacy-center/general-settings?tab=x',
    })) as ListResult;

    expect(result.data).toEqual([
      {
        title: 'Saving and publishing to the Privacy Center',
        url: 'https://docs.transcend.io/docs/privacy-center/saving',
        guideType: 'Overviews & Concepts',
        match: 'primary',
        route: '/privacy-center/general-settings',
      },
      {
        title: 'Consent setup',
        url: 'https://docs.transcend.io/docs/consent/setup',
        guideType: null,
        match: 'mention',
        route: '/privacy-center/general-settings',
      },
    ]);
  });

  it('falls back to the parent route and says so', async () => {
    mockFetch(() => new Response(ROUTES_JSON, { status: 200 }));
    const tool = createDocsListTool();
    const result = (await tool.handler({
      route: '/privacy-center/general-settings/deployment',
    })) as ListResult;

    expect(result.count).toBe(2);
    expect(result.paginationNote).toContain('parent route');
  });

  it('returns an empty list with a hint when nothing matches', async () => {
    mockFetch(() => new Response(ROUTES_JSON, { status: 200 }));
    const tool = createDocsListTool();
    const result = (await tool.handler({ route: '/unknown/page' })) as ListResult;

    expect(result.count).toBe(0);
    expect(result.paginationNote).toContain('query');
  });

  it('throws a clear error when the route index is not available', async () => {
    mockFetch(() => new Response('nope', { status: 404 }));
    const tool = createDocsListTool();
    await expect(tool.handler({ route: '/privacy-center/general-settings' })).rejects.toThrow(
      /route index is not available/,
    );
  });

  it('keeps query and section working when the route index is not available', async () => {
    mockFetch(() => new Response('nope', { status: 404 }));
    const tool = createDocsListTool();
    const result = (await tool.handler({ section: 'General' })) as ListResult;
    expect(result.count).toBe(1);
  });

  it('rejects route combined with query or section and names the conflict', async () => {
    mockFetch(() => new Response(ROUTES_JSON, { status: 200 }));
    const tool = createDocsListTool();
    await expect(tool.handler({ route: '/a', query: 'dsr' })).rejects.toThrow(
      /route cannot be combined with query/,
    );
    await expect(tool.handler({ route: '/a', section: 'General' })).rejects.toThrow(
      /route cannot be combined with section/,
    );
    await expect(tool.handler({ route: '/a', section: 'General', query: 'x' })).rejects.toThrow(
      /section or query/,
    );
  });

  it('rejects a URL that is not an app dashboard URL', async () => {
    mockFetch(() => new Response(ROUTES_JSON, { status: 200 }));
    const tool = createDocsListTool();
    await expect(tool.handler({ route: 'https://evil.example.com/x' })).rejects.toThrow(
      /app\.transcend\.io/,
    );
  });
});
