import { z } from '@transcend-io/mcp-server-base';
import { LRUCache } from 'lru-cache';

import type { DashboardRouteData } from './docsRoutes.js';
import { clearSearchIndexCache } from './docsSearch.js';

/** Public docs index URL (llms.txt). */
export const LLMS_TXT_URL = 'https://docs.transcend.io/llms.txt';

/** Admin Dashboard route to docs pages index. */
export const DASHBOARD_ROUTES_URL = 'https://docs.transcend.io/dashboard-routes.json';

/** Allowed hostname for fetched documentation articles. */
export const DOCS_HOST = 'docs.transcend.io';

/** Origin that relative article URLs in llms.txt resolve against. */
const DOCS_ORIGIN = `https://${DOCS_HOST}`;

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

/** Section for a top-level link that sits outside every group (the docs home, the changelog). */
const DEFAULT_SECTION = 'General';

const SECTION_HEADER = /^## (.+)$/;
const LIST_LINK = /^(\s*)- \[(.*?)\]\(([^)\s]+)\)(?::\s.*)?\s*$/;
const LIST_LABEL = /^(\s*)- ([^[\s].*)$/;

/**
 * Parses llms.txt markdown into structured entries.
 *
 * Two layouts are supported:
 * - The current one: top-level `- Group` bullets with `- [Title](/path): description`
 *   links nested under them at any depth. The top-level label is the section.
 * - The older one: `## Section` headers followed by `- [Title](url)` items.
 *
 * Relative URLs resolve against {@link DOCS_ORIGIN}. A top-level link outside any
 * group goes in the `General` section, or in the active `##` section when there is one.
 * Throws when the input has content but yields no articles, since an empty index would
 * otherwise look like "no such docs" instead of a format change.
 */
export function parseLlmsTxt(raw: string): DocEntry[] {
  const entries: DocEntry[] = [];
  const seenUrls = new Set<string>();
  let headerSection = '';
  let groupLabel = '';

  for (const line of raw.split('\n')) {
    const header = SECTION_HEADER.exec(line);
    if (header?.[1]) {
      headerSection = header[1].trim();
      groupLabel = '';
      continue;
    }

    const link = LIST_LINK.exec(line);
    if (link) {
      const [, indent = '', rawTitle = '', rawUrl = ''] = link;
      const title = rawTitle.trim();
      if (!title) {
        continue;
      }
      const section =
        indent.length === 0
          ? headerSection || DEFAULT_SECTION
          : groupLabel || headerSection || DEFAULT_SECTION;
      const url = resolveDocsUrl(rawUrl);
      // The search index keys documents by URL, and a page listed under two groups
      // would make it throw. Keep the first listing.
      if (seenUrls.has(url)) {
        continue;
      }
      seenUrls.add(url);
      entries.push({ section, title, url });
      continue;
    }

    const label = LIST_LABEL.exec(line);
    if (label?.[1] === '' && label[2]) {
      // A bare bullet at the top level starts a group, such as `- Privacy Center`.
      groupLabel = label[2].replace(/\*\*/g, '').trim();
    }
  }

  if (entries.length === 0 && raw.trim() !== '') {
    throw new Error(
      'llms.txt has content but no article links were recognized, so the format may have changed',
    );
  }
  return entries;
}

function resolveDocsUrl(url: string): string {
  try {
    return new URL(url.trim(), DOCS_ORIGIN).toString();
  } catch {
    return url.trim();
  }
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
  product: z.string().nullish().optional(),
  primary: z.array(RoutePageSchema).default([]),
  mentions: z.array(RoutePageSchema).default([]),
});

/** Schema for dashboard-routes.json. */
export const DashboardRoutesSchema = z.object({
  routes: z.record(z.string(), RouteEntrySchema),
  // Product fields are optional so an older index with only `routes` still parses.
  products: z.record(z.string(), z.array(RoutePageSchema)).optional(),
  productPrefixes: z
    .array(z.object({ prefix: z.string(), product: z.string().nullable() }))
    .optional(),
});

/** Parses and validates dashboard-routes.json. Throws when the shape is invalid. */
export function parseDashboardRoutes(raw: string): DashboardRouteData {
  return DashboardRoutesSchema.parse(JSON.parse(raw));
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

const routeIndexCache = new LRUCache<string, DashboardRouteData>({
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
export async function getRouteIndex(): Promise<DashboardRouteData> {
  let result: DashboardRouteData | undefined;
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
