import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DASHBOARD_ROUTES_URL,
  LLMS_TXT_URL,
  parseLlmsTxt,
  resetDocsCachesForTests,
} from '../src/docsIndex.js';
import { createDocsListTool } from '../src/tools/docs_list.js';

const SAVING_URL = 'https://docs.transcend.io/docs/privacy-center/saving';
const DOMAINS_URL = 'https://docs.transcend.io/docs/privacy-center/domains';
const SAVING_DESCRIPTION = 'Save and publish changes to the Privacy Center.';

const LLMS_TXT = [
  '# Transcend Documentation',
  '',
  '- Privacy Center',
  `  - [Saving and publishing](/docs/privacy-center/saving): ${SAVING_DESCRIPTION}`,
  '  - [Custom domains](/docs/privacy-center/domains)',
  '',
].join('\n');

const ROUTES_JSON = JSON.stringify({
  routes: {
    '/privacy-center/general-settings': {
      product: 'Privacy Center',
      primary: [{ title: 'Saving and publishing', url: SAVING_URL, guideType: null }],
      mentions: [],
    },
  },
  products: {
    'Privacy Center': [
      { title: 'Saving and publishing', url: SAVING_URL, guideType: null },
      { title: 'Custom domains', url: DOMAINS_URL, guideType: null },
    ],
  },
  productPrefixes: [{ prefix: '/privacy-center', product: 'Privacy Center' }],
});

type Row = { title: string; url: string; description?: string };
type ListResult = { data: Row[] };

function mockFetch(options: { llmsTxt?: () => Response } = {}): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url === LLMS_TXT_URL) {
      return options.llmsTxt?.() ?? new Response(LLMS_TXT, { status: 200 });
    }
    if (url === DASHBOARD_ROUTES_URL) {
      return new Response(ROUTES_JSON, { status: 200 });
    }
    // Article bodies are not needed: the search index falls back to the title.
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

const descriptionOf = (result: ListResult, url: string) =>
  result.data.find((row) => row.url === url)?.description;

afterEach(() => {
  resetDocsCachesForTests();
  vi.restoreAllMocks();
});

describe('parseLlmsTxt descriptions', () => {
  it('keeps the text after the colon and omits it when there is none', () => {
    const [saving, domains] = parseLlmsTxt(LLMS_TXT);
    expect(saving?.description).toBe(SAVING_DESCRIPTION);
    expect(domains).not.toHaveProperty('description');
  });
});

describe('docs_list row descriptions', () => {
  it('adds the description to section listing rows', async () => {
    mockFetch();
    const result = (await createDocsListTool().handler({
      section: 'Privacy Center',
    })) as ListResult;

    expect(descriptionOf(result, SAVING_URL)).toBe(SAVING_DESCRIPTION);
    expect(result.data.find((row) => row.url === DOMAINS_URL)).not.toHaveProperty('description');
  });

  it('adds the description to search hits', async () => {
    mockFetch();
    const result = (await createDocsListTool().handler({ query: 'publishing' })) as ListResult;

    expect(descriptionOf(result, SAVING_URL)).toBe(SAVING_DESCRIPTION);
  });

  it('joins the description onto route rows, which come from dashboard-routes.json', async () => {
    mockFetch();
    const result = (await createDocsListTool().handler({
      route: '/privacy-center/general-settings',
    })) as ListResult;

    expect(descriptionOf(result, SAVING_URL)).toBe(SAVING_DESCRIPTION);
    expect(result.data.find((row) => row.url === DOMAINS_URL)).not.toHaveProperty('description');
  });

  it('joins the description onto product rows', async () => {
    mockFetch();
    const result = (await createDocsListTool().handler({
      product: 'Privacy Center',
    })) as ListResult;

    expect(descriptionOf(result, SAVING_URL)).toBe(SAVING_DESCRIPTION);
  });

  it('returns route rows without descriptions when llms.txt cannot be loaded', async () => {
    mockFetch({ llmsTxt: () => new Response('down', { status: 500 }) });
    const result = (await createDocsListTool().handler({
      route: '/privacy-center/general-settings',
    })) as ListResult;

    expect(result.data.map((row) => row.url)).toContain(SAVING_URL);
    expect(descriptionOf(result, SAVING_URL)).toBeUndefined();
  });
});
