import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  docsPathToOpenApiPath,
  isApiReferenceUrl,
  OAS_JSON_URL,
  parseApiReferenceUrl,
  renderApiReferenceMarkdown,
  resetOpenApiCacheForTests,
} from '../src/apiReferenceMarkdown.js';
import { getBody, resetDocsCachesForTests } from '../src/docsIndex.js';
import { createDocsFetchTool } from '../src/tools/docs_fetch.js';

const FIXTURE_OAS = {
  openapi: '3.1.0',
  paths: {
    '/v1/enrich-identifiers': {
      post: {
        summary: 'Add info to a DSR before processing',
        description: 'Coordinate with your server before processing.',
        tags: ['DSR'],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['enrichedIdentifiers'],
                properties: {
                  enrichedIdentifiers: {
                    type: 'object',
                    description: 'Map of identifier name to values',
                  },
                  status: {
                    type: 'string',
                    enum: ['CONTINUE', 'CANCEL', 'HOLD'],
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Request received.' },
          '400': { description: 'Malformed input.' },
        },
      },
    },
    '/v1/data-silo/{id}/pending-requests/{type}': {
      get: {
        summary: 'List active requests',
        responses: { '200': { description: 'OK' } },
      },
    },
  },
  webhooks: {
    '/webhook/new-preflight-request-job': {
      post: {
        summary: 'New preflight request job',
        description: 'Preflight enrichment webhook.',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Accepted' } },
      },
    },
  },
};

describe('api reference URL helpers', () => {
  it('detects api-reference paths', () => {
    expect(
      isApiReferenceUrl('https://docs.transcend.io/docs/api-reference/POST/v1/enrich-identifiers'),
    ).toBe(true);
    expect(
      isApiReferenceUrl('https://docs.transcend.io/docs/articles/custom-functions-overview.md'),
    ).toBe(false);
  });

  it('maps docs path params to OpenAPI braces', () => {
    expect(docsPathToOpenApiPath('/v1/data-silo/(id)/pending-requests/(type)')).toBe(
      '/v1/data-silo/{id}/pending-requests/{type}',
    );
  });

  it('parses operation and webhook URLs', () => {
    expect(
      parseApiReferenceUrl(
        'https://docs.transcend.io/docs/api-reference/POST/v1/enrich-identifiers',
      ),
    ).toEqual({ kind: 'operation', method: 'post', key: '/v1/enrich-identifiers' });
    expect(
      parseApiReferenceUrl(
        'https://docs.transcend.io/docs/api-reference/webhook/new-preflight-request-job',
      ),
    ).toEqual({ kind: 'webhook', key: '/webhook/new-preflight-request-job' });
    expect(
      parseApiReferenceUrl(
        'https://docs.transcend.io/docs/api-reference/GET/v1/data-silo/(id)/pending-requests/(type)',
      ),
    ).toEqual({
      kind: 'operation',
      method: 'get',
      key: '/v1/data-silo/{id}/pending-requests/{type}',
    });
  });
});

describe('renderApiReferenceMarkdown', () => {
  afterEach(() => {
    resetOpenApiCacheForTests();
    resetDocsCachesForTests();
    vi.restoreAllMocks();
  });

  it('renders operation markdown from OpenAPI without HTML boilerplate', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input) === OAS_JSON_URL) {
        return new Response(JSON.stringify(FIXTURE_OAS), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    const url = 'https://docs.transcend.io/docs/api-reference/POST/v1/enrich-identifiers';
    const markdown = await renderApiReferenceMarkdown(url);

    expect(markdown).toContain('# Add info to a DSR before processing');
    expect(markdown).toContain('`POST /v1/enrich-identifiers`');
    expect(markdown).toContain('enrichedIdentifiers');
    expect(markdown).toContain('**200**');
    expect(markdown).not.toContain('<style');
    expect(markdown).not.toContain('<script');
    expect(markdown).toContain(`Source: ${url}`);
  });

  it('renders webhook markdown from OpenAPI', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input) === OAS_JSON_URL) {
        return new Response(JSON.stringify(FIXTURE_OAS), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    const markdown = await renderApiReferenceMarkdown(
      'https://docs.transcend.io/docs/api-reference/webhook/new-preflight-request-job',
    );
    expect(markdown).toContain('New preflight request job');
    expect(markdown).toContain('`POST /webhook/new-preflight-request-job`');
  });
});

describe('getBody HTML safety', () => {
  afterEach(() => {
    resetDocsCachesForTests();
    vi.restoreAllMocks();
  });

  it('rejects HTML responses for article URLs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<!DOCTYPE html><html><body>nope</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    );

    await expect(
      getBody('https://docs.transcend.io/docs/articles/dsr-automation.md'),
    ).rejects.toThrow(/HTML instead of markdown/);
  });

  it('resolves api-reference URLs via OpenAPI in getBody', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input) === OAS_JSON_URL) {
        return new Response(JSON.stringify(FIXTURE_OAS), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    const url = 'https://docs.transcend.io/docs/api-reference/POST/v1/enrich-identifiers';
    const body = await getBody(url);
    expect(body).toContain('Add info to a DSR before processing');
    expect(body).not.toContain('<!DOCTYPE');
  });
});

describe('docs_fetch api-reference', () => {
  afterEach(() => {
    resetDocsCachesForTests();
    vi.restoreAllMocks();
  });

  it('returns OpenAPI markdown for api-reference URLs', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input) === OAS_JSON_URL) {
        return new Response(JSON.stringify(FIXTURE_OAS), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    const url = 'https://docs.transcend.io/docs/api-reference/POST/v1/enrich-identifiers';
    const result = (await createDocsFetchTool().handler({ url })) as {
      success: boolean;
      data: { markdown: string };
    };
    expect(result.success).toBe(true);
    expect(result.data.markdown).toContain('`POST /v1/enrich-identifiers`');
    expect(result.data.markdown.match(/Source:/g)?.length).toBe(1);
  });
});
