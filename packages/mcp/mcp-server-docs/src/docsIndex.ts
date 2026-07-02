import { LRUCache } from 'lru-cache';

/** Public docs index URL (llms.txt). */
export const LLMS_TXT_URL = 'https://docs.transcend.io/llms.txt';

/** Allowed hostname for fetched documentation articles. */
export const DOCS_HOST = 'docs.transcend.io';

const INDEX_CACHE_KEY = 'index';
const DEFAULT_INDEX_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BODY_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_BODY_CACHE_ENTRIES = 400;

/** A single article entry from llms.txt. */
export interface DocEntry {
  /** Section header from llms.txt (e.g. "General", "Use Case Guides"). */
  section: string;
  /** Human-readable article title. */
  title: string;
  /** Absolute URL to the article markdown (.md). */
  url: string;
}

/**
 * Parses llms.txt markdown into structured entries.
 * Expects `## Section` headers and `- [Title](url)` list items.
 */
export function parseLlmsTxt(raw: string): DocEntry[] {
  const entries: DocEntry[] = [];
  let currentSection = '';

  for (const line of raw.split('\n')) {
    const sectionMatch = /^## (.+)$/.exec(line);
    if (sectionMatch?.[1]) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    const linkMatch = /^- \[(.+)\]\((.+)\)\s*$/.exec(line);
    if (linkMatch?.[1] && linkMatch[2] && currentSection) {
      entries.push({
        section: currentSection,
        title: linkMatch[1].trim(),
        url: linkMatch[2].trim(),
      });
    }
  }

  return entries;
}

async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(url, {
    headers: { Accept: 'text/markdown, text/plain' },
    signal: signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  return response.text();
}

const indexCache = new LRUCache<string, DocEntry[]>({
  max: 1,
  ttl: DEFAULT_INDEX_TTL_MS,
  allowStale: true,
  allowStaleOnFetchRejection: true,
  fetchMethod: async (_key, _stale, { signal }) => {
    const raw = await fetchText(LLMS_TXT_URL, signal);
    return parseLlmsTxt(raw);
  },
});

const bodyCache = new LRUCache<string, string>({
  max: MAX_BODY_CACHE_ENTRIES,
  ttl: DEFAULT_BODY_TTL_MS,
  allowStale: true,
  allowStaleOnFetchRejection: true,
  fetchMethod: async (url, _stale, { signal }) => fetchText(url, signal),
});

/** Returns the parsed llms.txt index (cached with TTL). */
export async function getIndex(): Promise<DocEntry[]> {
  const result = await indexCache.fetch(INDEX_CACHE_KEY);
  if (!result) {
    throw new Error('Failed to load documentation index');
  }
  return result;
}

/** Fetches and caches markdown body for a docs.transcend.io article URL. */
export async function getBody(url: string): Promise<string> {
  assertDocsHost(url);
  const result = await bodyCache.fetch(url);
  if (result === undefined) {
    throw new Error(`Failed to fetch documentation: ${url}`);
  }
  return result;
}

/** Validates that a URL targets docs.transcend.io (SSRF guard for fetch). */
export function assertDocsHost(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid documentation URL: ${url}`);
  }
  if (parsed.hostname !== DOCS_HOST) {
    throw new Error(`URL host must be ${DOCS_HOST}, got ${parsed.hostname}`);
  }
}

/** Clears in-memory caches (for tests). */
export function resetDocsCachesForTests(): void {
  indexCache.clear();
  bodyCache.clear();
}
