import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { LLMS_TXT_URL, resetDocsCachesForTests } from '../src/docsIndex.js';
import { createDocsFetchTool } from '../src/tools/docs_fetch.js';
import { createDocsListTool } from '../src/tools/docs_list.js';
import { getDocsTools } from '../src/tools/index.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const fixtureLlmsTxt = readFileSync(join(fixturesDir, 'llms.txt'), 'utf8');
const fixtureLlmsSearch = readFileSync(join(fixturesDir, 'llms-search.txt'), 'utf8');

const DASHBOARD_URL =
  'https://docs.transcend.io/docs/articles/consent-management/reference/metrics-reporting/consent-dashboard.md';
const TELEMETRY_URL =
  'https://docs.transcend.io/docs/articles/consent-management/reference/telemetry-and-data-flows/telemetry.md';
const REGIONAL_URL =
  'https://docs.transcend.io/docs/articles/use-case-guides/regional-experiences.md';

function mockDocsFetch(options: {
  /** llms.txt body */
  llmsTxt: string;
  /** Per-article markdown keyed by URL */
  bodies: Record<string, string>;
}): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url === LLMS_TXT_URL) {
      return new Response(options.llmsTxt, { status: 200 });
    }
    const body = options.bodies[url];
    if (body !== undefined) {
      return new Response(body, { status: 200 });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

describe('getDocsTools', () => {
  it('registers list and fetch tools', () => {
    const tools = getDocsTools();
    expect(tools).toHaveLength(2);
    expect(tools.map((tool) => tool.name)).toEqual(['docs_list', 'docs_fetch']);
    expect(tools.every((tool) => tool.requireAuth === false)).toBe(true);
  });
});

describe('docs_list', () => {
  afterEach(() => {
    resetDocsCachesForTests();
    vi.restoreAllMocks();
  });

  it('returns the full index when no filters are provided', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(fixtureLlmsTxt, { status: 200 }));

    const tool = createDocsListTool();
    const result = (await tool.handler({})) as {
      success: boolean;
      data: Array<{ title: string; section: string; url: string }>;
      count: number;
    };

    expect(result.success).toBe(true);
    expect(result.count).toBe(3);
    expect(result.data[0]?.title).toBe('DSR Automation');
  });

  it('filters by section and keyword', async () => {
    mockDocsFetch({
      llmsTxt: fixtureLlmsTxt,
      bodies: {
        'https://docs.transcend.io/docs/articles/dsr-automation.md':
          '# DSR Automation\n\nRequests.',
        'https://docs.transcend.io/docs/articles/consent-management.md':
          '# Consent Management\n\nConsent banner configuration.',
        'https://docs.transcend.io/docs/articles/use-case-guides/regional-experiences.md':
          '# Regional Experiences\n\nGeo targeting.',
      },
    });

    const tool = createDocsListTool();
    const result = (await tool.handler({ section: 'General', keyword: 'consent' })) as {
      success: boolean;
      data: Array<{ title: string }>;
      count: number;
    };

    expect(result.count).toBe(1);
    expect(result.data[0]?.title).toBe('Consent Management');
  });

  it('ranks body matches for session when the title does not contain the term', async () => {
    mockDocsFetch({
      llmsTxt: fixtureLlmsSearch,
      bodies: {
        [DASHBOARD_URL]:
          '**Sessions**: a unique sessionStorage context. In most browsers, each tab gets a unique sessionStorage context.',
        [TELEMETRY_URL]:
          'A "session" is defined as a unique sessionStorage context. Telemetry includes cumulative unique sessionStorage contexts.',
        [REGIONAL_URL]: 'Configure regional consent experiences and banner copy.',
      },
    });

    const tool = createDocsListTool();
    const result = (await tool.handler({ keyword: 'session' })) as {
      success: boolean;
      data: Array<{ title: string; snippet: string }>;
      count: number;
    };

    expect(result.success).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(2);
    const titles = result.data.map((hit) => hit.title);
    expect(titles).toContain('Consent Dashboard');
    expect(titles).toContain('Transcend-Stored Telemetry Data');
    expect(titles.slice(0, 2)).toEqual(
      expect.arrayContaining(['Consent Dashboard', 'Transcend-Stored Telemetry Data']),
    );
    const dashboard = result.data.find((hit) => hit.title === 'Consent Dashboard');
    expect(dashboard?.snippet.toLowerCase()).toContain('sessionstorage');
  });
});

describe('docs_fetch', () => {
  afterEach(() => {
    resetDocsCachesForTests();
    vi.restoreAllMocks();
  });

  it('returns markdown with a Source footer for valid docs URLs', async () => {
    const url = 'https://docs.transcend.io/docs/articles/dsr-automation.md';
    const body = '# DSR Automation\n\nContent here.';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const requestUrl = String(input);
      if (requestUrl === LLMS_TXT_URL) {
        return new Response(fixtureLlmsTxt, { status: 200 });
      }
      if (requestUrl === url) {
        return new Response(body, { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${requestUrl}`);
    });

    const tool = createDocsFetchTool();
    const result = (await tool.handler({ url })) as {
      success: boolean;
      data: { url: string; markdown: string };
    };

    expect(result.success).toBe(true);
    expect(result.data.url).toBe(url);
    expect(result.data.markdown).toContain(body);
    expect(result.data.markdown).toContain(`Source: ${url}`);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('rejects URLs outside docs.transcend.io', async () => {
    const tool = createDocsFetchTool();
    await expect(tool.handler({ url: 'https://evil.example.com/docs.md' })).rejects.toThrow(
      /docs\.transcend\.io/,
    );
  });
});
