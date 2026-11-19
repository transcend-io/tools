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
const nestedFixtureLlmsTxt = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'fixtures/llms-nested.txt'),
  'utf8',
);

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

  it('skips list items with an empty title', () => {
    const raw = `## General
- [](https://docs.transcend.io/docs/articles/empty.md)
- [Kept](https://docs.transcend.io/docs/articles/kept.md)
`;
    expect(parseLlmsTxt(raw)).toEqual([
      {
        section: 'General',
        title: 'Kept',
        url: 'https://docs.transcend.io/docs/articles/kept.md',
      },
    ]);
  });
});

describe('parseLlmsTxt nested format', () => {
  const entries = parseLlmsTxt(nestedFixtureLlmsTxt);
  const find = (title: string) => entries.find((entry) => entry.title === title);

  it('resolves relative URLs against docs.transcend.io', () => {
    expect(find('Glossary')).toEqual({
      section: 'Overview',
      title: 'Glossary',
      url: 'https://docs.transcend.io/docs/overview/glossary',
      description: 'Glossary of terminology used throughout the Transcend platform',
    });
    expect(entries.every((entry) => entry.url.startsWith('https://docs.transcend.io/'))).toBe(true);
  });

  it('uses the top-level group as the section at any depth', () => {
    expect(find('Action Items')?.section).toBe('Overview');
    expect(find('Privacy Center Concepts')?.section).toBe('Privacy Center');
    expect(find('Classify inputs using the LLM classifier')?.section).toBe('API reference');
  });

  it('puts top-level links outside any group in General', () => {
    expect(find('The Comprehensive Privacy Platform')?.section).toBe('General');
    expect(find('Changelog')?.section).toBe('General');
  });

  it('keeps descriptions, drops bold markers from sections, and counts every article link', () => {
    expect(find('Glossary')?.title).toBe('Glossary');
    expect(entries.map((entry) => entry.section)).not.toContain('**Reference**');
    expect(entries).toHaveLength(nestedFixtureLlmsTxt.match(/^\s*- \[/gm)?.length ?? -1);
  });

  it('throws when the input has content but no recognizable articles', () => {
    expect(() => parseLlmsTxt('# Transcend\n\nNothing here has the expected list shape.')).toThrow(
      /format may have changed/,
    );
  });

  it('keeps the first listing of a page that appears under two groups', () => {
    const raw = [
      '- Privacy Center',
      '  - [Multi-brand](/docs/privacy-center/multi-brand)',
      '- Consent Management',
      '  - [Multi-brand again](/docs/privacy-center/multi-brand): listed twice',
    ].join('\n');
    expect(parseLlmsTxt(raw)).toEqual([
      {
        section: 'Privacy Center',
        title: 'Multi-brand',
        url: 'https://docs.transcend.io/docs/privacy-center/multi-brand',
      },
    ]);
  });

  it('returns no entries for an empty file', () => {
    expect(parseLlmsTxt('  \n')).toEqual([]);
  });
});

describe('getIndex caching', () => {
  afterEach(() => {
    resetDocsCachesForTests();
    vi.restoreAllMocks();
  });

  it('rejects instead of caching an empty index when the format is unrecognized', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('# Transcend\n\nNo list here.', { status: 200 }),
    );
    await expect(getIndex()).rejects.toThrow();
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
