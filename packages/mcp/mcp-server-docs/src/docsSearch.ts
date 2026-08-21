import { create, insertMultiple, search } from '@orama/orama';
import { LRUCache } from 'lru-cache';

import { getBody, getIndex, type DocEntry } from './docsIndex.js';

const SEARCH_CACHE_KEY = 'search';
const SEARCH_INDEX_TTL_MS = 24 * 60 * 60 * 1000;
const SEARCH_LIMIT = 10;
const HYDRATE_CONCURRENCY = 15;
const SNIPPET_CHARS = 200;
const SNIPPET_PREFIX = 40;

const DOC_SCHEMA = {
  title: 'string',
  urlPath: 'string',
  section: 'string',
  body: 'string',
  url: 'string',
} as const;

function createDocsDb() {
  return create({ schema: DOC_SCHEMA });
}

type DocsOrama = ReturnType<typeof createDocsDb>;

/** Ranked article hit returned by docs_list keyword search. */
export interface DocsSearchHit {
  /** Human-readable article title. */
  title: string;
  /** Section header from llms.txt. */
  section: string;
  /** Absolute URL to the article markdown. */
  url: string;
  /** Orama BM25 score. */
  score: number;
  /** Short excerpt around the first query term. */
  snippet: string;
}

function urlToSearchText(url: string): string {
  try {
    return new URL(url).pathname
      .replace(/\.md$/i, '')
      .split(/[-_/]+/)
      .filter(Boolean)
      .join(' ');
  } catch {
    return '';
  }
}

function extractSnippet(text: string, query: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  if (!collapsed) {
    return '';
  }
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 1);
  const lower = collapsed.toLowerCase();
  let matchIndex = -1;
  for (const term of terms) {
    matchIndex = lower.indexOf(term);
    if (matchIndex !== -1) {
      break;
    }
  }
  if (matchIndex === -1) {
    return collapsed.length > SNIPPET_CHARS
      ? `${collapsed.slice(0, SNIPPET_CHARS).trim()}…`
      : collapsed;
  }
  const start = Math.max(0, matchIndex - SNIPPET_PREFIX);
  const end = Math.min(collapsed.length, start + SNIPPET_CHARS);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < collapsed.length ? '…' : '';
  return `${prefix}${collapsed.slice(start, end).trim()}${suffix}`;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function hydrateEntry(entry: DocEntry) {
  let body = '';
  try {
    body = await getBody(entry.url);
  } catch {
    // Index the title even when the article body cannot be fetched.
  }
  return {
    id: entry.url,
    title: entry.title,
    urlPath: urlToSearchText(entry.url),
    section: entry.section,
    body,
    url: entry.url,
  };
}

async function buildSearchIndex(): Promise<DocsOrama> {
  const entries = await getIndex();
  const documents = await mapWithConcurrency(entries, HYDRATE_CONCURRENCY, hydrateEntry);
  const db = createDocsDb();
  if (documents.length > 0) {
    await Promise.resolve(insertMultiple(db, documents));
  }
  return db;
}

const searchIndexCache = new LRUCache<string, DocsOrama>({
  max: 1,
  ttl: SEARCH_INDEX_TTL_MS,
  allowStale: true,
  allowStaleOnFetchRejection: true,
  fetchMethod: async () => buildSearchIndex(),
});

/** Clears the Orama index (called from {@link resetDocsCachesForTests}). */
export function clearSearchIndexCache(): void {
  searchIndexCache.clear();
}

/** Full-text search over hydrated docs (title, URL path, section, body). */
export async function searchDocs(
  query: string,
  options: {
    /** Optional llms.txt section name (exact match). */
    section?: string;
  } = {},
): Promise<{
  /** Ranked hits for this page. */
  hits: DocsSearchHit[];
  /** Total matches before the fixed page size. */
  totalCount: number;
}> {
  const term = query.trim();
  if (!term) {
    return { hits: [], totalCount: 0 };
  }

  const db = await searchIndexCache.fetch(SEARCH_CACHE_KEY);
  if (!db) {
    throw new Error('Failed to build documentation search index');
  }

  const results = await Promise.resolve(
    search(db, {
      term,
      limit: SEARCH_LIMIT,
      tolerance: 1,
      threshold: 1,
      boost: {
        title: 4,
        urlPath: 2,
        section: 1.5,
        body: 1,
      },
      ...(options.section ? { where: { section: options.section } } : {}),
    }),
  );

  const hits: DocsSearchHit[] = results.hits.map((hit) => {
    const document = hit.document;
    return {
      title: document.title,
      section: document.section,
      url: document.url,
      score: hit.score,
      snippet: extractSnippet(`${document.title} ${document.body}`, term),
    };
  });

  return { hits, totalCount: results.count };
}
