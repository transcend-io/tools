import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  assertDocsHost,
  getBody,
  getIndex,
  LLMS_TXT_URL,
  parseLlmsTxt,
  resetDocsCachesForTests,
} from '../src/docsIndex.js';

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/llms.txt');
const fixtureLlmsTxt = readFileSync(fixturePath, 'utf8');

describe('parseLlmsTxt', () => {
  it('parses sections and article links', () => {
    const entries = parseLlmsTxt(fixtureLlmsTxt);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({
      section: 'General',
      title: 'DSR Automation',
      url: 'https://docs.transcend.io/docs/articles/dsr-automation.md',
    });
    expect(entries[2]).toEqual({
      section: 'Use Case Guides',
      title: 'Regional Experiences',
      url: 'https://docs.transcend.io/docs/articles/use-case-guides/regional-experiences.md',
    });
  });
});

describe('getIndex caching', () => {
  afterEach(() => {
    resetDocsCachesForTests();
    vi.restoreAllMocks();
  });

  it('fetches llms.txt once and serves subsequent calls from cache', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(fixtureLlmsTxt, { status: 200 }));

    const first = await getIndex();
    const second = await getIndex();

    expect(first).toHaveLength(3);
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      LLMS_TXT_URL,
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: expect.any(String) }),
      }),
    );
  });
});

describe('assertDocsHost', () => {
  it('accepts docs.transcend.io URLs', () => {
    expect(() =>
      assertDocsHost('https://docs.transcend.io/docs/articles/dsr-automation.md'),
    ).not.toThrow();
  });

  it('rejects other hosts', () => {
    expect(() => assertDocsHost('https://evil.example.com/docs.md')).toThrow(/docs\.transcend\.io/);
  });
});

describe('getBody', () => {
  afterEach(() => {
    resetDocsCachesForTests();
    vi.restoreAllMocks();
  });

  it('fetches and caches article bodies for valid docs URLs', async () => {
    const url = 'https://docs.transcend.io/docs/articles/dsr-automation.md';
    const body = '# DSR Automation\n\nContent here.';
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(body, { status: 200 }));

    const first = await getBody(url);
    const second = await getBody(url);

    expect(first).toBe(body);
    expect(second).toBe(body);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
