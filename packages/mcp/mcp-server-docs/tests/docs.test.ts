import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { LLMS_TXT_URL, resetDocsCachesForTests } from '../src/docsIndex.js';
import { createDocsFetchTool } from '../src/tools/docs_fetch.js';
import { createDocsListTool } from '../src/tools/docs_list.js';
import { getDocsTools } from '../src/tools/index.js';

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/llms.txt');
const fixtureLlmsTxt = readFileSync(fixturePath, 'utf8');

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
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(fixtureLlmsTxt, { status: 200 }));

    const tool = createDocsListTool();
    const result = (await tool.handler({ section: 'General', keyword: 'consent' })) as {
      success: boolean;
      data: Array<{ title: string }>;
      count: number;
    };

    expect(result.count).toBe(1);
    expect(result.data[0]?.title).toBe('Consent Management');
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
