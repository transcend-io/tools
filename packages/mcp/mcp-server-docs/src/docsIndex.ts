import { z } from '@transcend-io/mcp-server-base';
import { LRUCache } from 'lru-cache';

import type { RouteIndex } from './docsRoutes.js';
import { clearSearchIndexCache } from './docsSearch.js';

/** Public docs index URL (llms.txt). */
export const LLMS_TXT_URL = 'https://docs.transcend.io/llms.txt';

/** Admin Dashboard route to docs pages index. */
export const DASHBOARD_ROUTES_URL = 'https://docs.transcend.io/dashboard-routes.json';

/** Allowed hostname for fetched documentation articles. */
export const DOCS_HOST = 'docs.transcend.io';

const INDEX_CACHE_KEY = 'index';
const ROUTES_CACHE_KEY = 'routes';
const DEFAULT_INDEX_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BODY_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_BODY_CACHE_ENTRIES = 600;

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
      const title = linkMatch[1].trim();
      if (!title) {
        continue;
      }
      entries.push({
        section: currentSection,
        title,
        url: linkMatch[2].trim(),
      });
    }
  }

  return entries;
}

const RoutePageSchema = z.object({
  title: z.string(),
  url: z.string(),
  guideType: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
});

const RouteEntrySchema = z.object({
  primary: z.array(RoutePageSchema).default([]),
  mentions: z.array(RoutePageSchema).default([]),
});

/** Schema for dashboard-routes.json. */
export const DashboardRoutesSchema = z.object({
  routes: z.record(z.string(), RouteEntrySchema),
});

/** Parses and validates dashboard-routes.json. Throws when the shape is invalid. */
export function parseDashboardRoutes(raw: string): RouteIndex {
  return DashboardRoutesSchema.parse(JSON.parse(raw)).routes;
}

/** Thrown when dashboard-routes.json cannot be fetched or is invalid. */
export class RouteIndexUnavailableError extends Error {
  constructor(cause: unknown) {
    super(
      `The Admin Dashboard route index is not available: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
      { cause },
    );
    this.name = 'RouteIndexUnavailableError';
  }
}

async function fetchText(
  url: string,
  signal?: AbortSignal,
  accept = 'text/markdown, text/plain',
): Promise<string> {
  const response = await fetch(url, {
    headers: { Accept: accept },
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

const routeIndexCache = new LRUCache<string, RouteIndex>({
  max: 1,
  ttl: DEFAULT_INDEX_TTL_MS,
  allowStale: true,
  allowStaleOnFetchRejection: true,
  fetchMethod: async (_key, _stale, { signal }) => {
    const raw = await fetchText(DASHBOARD_ROUTES_URL, signal, 'application/json');
    return parseDashboardRoutes(raw);
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

/**
 * Returns the parsed dashboard-routes.json index (cached with TTL).
 * Throws {@link RouteIndexUnavailableError} when it is missing or invalid.
 */
export async function getRouteIndex(): Promise<RouteIndex> {
  let result: RouteIndex | undefined;
  try {
    result = await routeIndexCache.fetch(ROUTES_CACHE_KEY);
  } catch (error) {
    throw new RouteIndexUnavailableError(error);
  }
  if (!result) {
    throw new RouteIndexUnavailableError('empty response');
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
  routeIndexCache.clear();
  bodyCache.clear();
  clearSearchIndexCache();
}
